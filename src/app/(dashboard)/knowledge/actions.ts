"use server";

import { createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { chunkText } from "@/lib/ingest/chunking";
import { getEmbedding } from "@/lib/llm/embedding";

export type DocumentUploadResult =
  | {
      ok: true;
      documentId: string;
      isNewUpload: boolean;
      chunkCount: number;
    }
  | { ok: false; error: string };

/**
 * Upload a knowledge document (markdown or text file).
 * Chunks the content, embeds each chunk, and stores in workspace_documents + document_chunks.
 * Idempotent: re-uploading the same content by SHA-256 hash returns the existing document_id.
 *
 * @param formData - Expected fields: "file" (File), "title" (string, optional)
 * @returns DocumentUploadResult
 */
export async function uploadDocumentAction(
  _prev: DocumentUploadResult | undefined,
  formData: FormData
): Promise<DocumentUploadResult> {
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return { ok: false, error: "No file provided." };
  }

  if (file.size === 0) {
    return { ok: false, error: "File is empty." };
  }

  if (file.size > 10 * 1024 * 1024) {
    return { ok: false, error: "File too large. Max 10 MB." };
  }

  // v1: md and txt only
  const ext = file.name.split(".").pop()?.toLowerCase();
  if (!ext || !["md", "markdown", "txt", "text"].includes(ext)) {
    return { ok: false, error: "Only .md and .txt files are supported in v1." };
  }

  const supabase = await createClient();

  // Auth check
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "Not signed in." };
  }

  // Load user's workspace (client_id)
  const { data: appUser, error: appUserErr } = await supabase
    .from("users")
    .select("client_id")
    .eq("id", user.id)
    .single();
  if (appUserErr || !appUser) {
    return { ok: false, error: "Could not load your account." };
  }
  const workspaceId = appUser.client_id;

  // Read file content
  let content: string;
  try {
    content = await file.text();
  } catch (err) {
    return { ok: false, error: "Failed to read file." };
  }

  if (content.trim().length === 0) {
    return { ok: false, error: "File is empty after reading." };
  }

  // Compute SHA-256 hash for idempotence
  const hash = createHash("sha256").update(content).digest("hex");

  // Check if this hash already exists (idempotence)
  const { data: existing } = await supabase
    .from("workspace_documents")
    .select("id, chunk_count")
    .eq("workspace_id", workspaceId)
    .eq("content_hash", hash)
    .single();

  if (existing) {
    return {
      ok: true,
      documentId: existing.id,
      isNewUpload: false,
      chunkCount: existing.chunk_count ?? 0,
    };
  }

  // New upload: insert document row (status=pending)
  const title = formData.get("title") || file.name;
  const sourceUri = file.name;

  const { data: doc, error: docInsertErr } = await supabase
    .from("workspace_documents")
    .insert({
      workspace_id: workspaceId,
      source_type: "markdown", // v1: treat all as markdown for now
      source_uri: sourceUri,
      title: String(title),
      content_hash: hash,
      uploaded_by: user.id,
      status: "pending",
    })
    .select("id")
    .single();

  if (docInsertErr || !doc) {
    return {
      ok: false,
      error: `Failed to create document record: ${docInsertErr?.message}`,
    };
  }

  const documentId = doc.id;

  try {
    // Chunk the document
    const chunks = chunkText(content);
    if (chunks.length === 0) {
      // Empty after chunking — mark as failed
      await supabase
        .from("workspace_documents")
        .update({
          status: "failed",
          error_message: "Document produced zero chunks.",
        })
        .eq("id", documentId);
      return { ok: false, error: "Document produced no chunks." };
    }

    // Embed and insert chunks. Pass workspace context so embeddings go
    // through the BYO LLM provider (Settings → LLM provider) when configured;
    // falls back to env Bedrock Titan otherwise.
    const chunkRecords = [];
    for (let i = 0; i < chunks.length; i++) {
      const chunkText = chunks[i];
      let embedding: number[];
      try {
        embedding = await getEmbedding(chunkText, {
          supabase,
          clientId: workspaceId,
        });
      } catch (err) {
        // Embedding failed — mark document as failed
        await supabase
          .from("workspace_documents")
          .update({
            status: "failed",
            error_message: `Embedding failed for chunk ${i}: ${String(err)}`,
          })
          .eq("id", documentId);
        return {
          ok: false,
          error: `Failed to embed chunk ${i}: ${String(err)}`,
        };
      }

      chunkRecords.push({
        document_id: documentId,
        chunk_index: i,
        text: chunkText,
        text_length: chunkText.length,
        embedding,
      });
    }

    // Batch insert chunks
    const { error: chunkInsertErr } = await supabase
      .from("document_chunks")
      .insert(chunkRecords);

    if (chunkInsertErr) {
      // Chunks insert failed — mark document as failed
      await supabase
        .from("workspace_documents")
        .update({
          status: "failed",
          error_message: `Failed to insert chunks: ${chunkInsertErr.message}`,
        })
        .eq("id", documentId);
      return {
        ok: false,
        error: `Failed to insert chunks: ${chunkInsertErr.message}`,
      };
    }

    // Update document to ready + set chunk_count
    const { error: updateErr } = await supabase
      .from("workspace_documents")
      .update({
        status: "ready",
        chunk_count: chunks.length,
      })
      .eq("id", documentId);

    if (updateErr) {
      return {
        ok: false,
        error: `Failed to finalize document: ${updateErr.message}`,
      };
    }

    revalidatePath("/knowledge");

    return {
      ok: true,
      documentId,
      isNewUpload: true,
      chunkCount: chunks.length,
    };
  } catch (err) {
    // Catch-all: mark document as failed
    await supabase
      .from("workspace_documents")
      .update({
        status: "failed",
        error_message: `Unexpected error: ${String(err)}`,
      })
      .eq("id", documentId);

    return {
      ok: false,
      error: `Unexpected error: ${String(err)}`,
    };
  }
}

export type DocumentDeleteResult =
  | { ok: true }
  | { ok: false; error: string };

/**
 * Delete a knowledge document. Cascade-deletes all its chunks.
 * Authorization: only admin or qa_manager in the document's workspace can delete.
 */
export async function deleteDocumentAction(
  documentId: string
): Promise<DocumentDeleteResult> {
  if (!documentId || typeof documentId !== "string") {
    return { ok: false, error: "Missing document id." };
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "Not signed in." };
  }

  const { data: appUser, error: appUserErr } = await supabase
    .from("users")
    .select("client_id, role")
    .eq("id", user.id)
    .single();
  if (appUserErr || !appUser) {
    return { ok: false, error: "Could not load your account." };
  }

  if (appUser.role !== "admin" && appUser.role !== "qa_manager") {
    return { ok: false, error: "You don't have permission to delete documents." };
  }

  const { error: delErr } = await supabase
    .from("workspace_documents")
    .delete()
    .eq("id", documentId)
    .eq("workspace_id", appUser.client_id);

  if (delErr) {
    return { ok: false, error: `Failed to delete: ${delErr.message}` };
  }

  revalidatePath("/knowledge");
  return { ok: true };
}
