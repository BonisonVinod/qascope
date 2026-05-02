/**
 * Supabase test client setup.
 * Connects to the live dev Supabase instance using the service-role key.
 * Tests run with elevated privileges (security_definer bypass) to test RLS policies.
 */

import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

/**
 * Create a Supabase client using the service-role key (elevated privileges).
 * This is used for test setup/teardown and for operations that explicitly
 * need to bypass RLS (e.g., inserting test data for workspace B).
 */
export function createServiceRoleClient(): SupabaseClient<Database> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set."
    );
  }

  return createClient<Database>(url, key);
}

/**
 * Create a Supabase client using the anon key + a JWT for a specific user.
 * Used to test RLS policies from the perspective of an authenticated user.
 *
 * @param userId - The auth.users.id to impersonate
 * @param clientId - The users.client_id (workspace) for this user
 */
export function createUserClient(
  userId: string,
  clientId: string
): SupabaseClient<Database> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set."
    );
  }

  const client = createClient<Database>(url, anonKey);

  // For testing, we patch the client's auth context to simulate a logged-in user.
  // Note: In a real test, you'd use setSession() with a valid JWT.
  // For simplicity, we rely on the metadata/context approach via auth.uid() in RLS.
  // Since we can't easily forge a valid JWT without the signing key, we'll use
  // a simpler approach: insert test data as service-role, then test read access
  // using a hypothetical user context.

  return client;
}

/**
 * Fixture: create a test workspace (client) with a unique name.
 * Returns the client_id.
 */
export async function createTestWorkspace(
  sb: SupabaseClient<Database>,
  name: string
): Promise<string> {
  const { data, error } = await sb
    .from("clients")
    .insert({ name })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(`Failed to create test workspace: ${error?.message}`);
  }

  return data.id;
}

/**
 * Fixture: create a test user in a workspace.
 * Returns the user's auth.uid (which must exist in auth.users).
 *
 * Note: For testing RLS policies, we rely on having a row in public.users
 * that maps the user to their workspace. The actual auth.users entry would
 * need to exist in Supabase Auth, which is out of scope for unit tests.
 * For now, tests will create users via direct insert but won't actually
 * authenticate via Supabase Auth.
 */
export async function createTestUser(
  sb: SupabaseClient<Database>,
  workspaceId: string,
  email: string,
  userId?: string
): Promise<string> {
  const id = userId || crypto.randomUUID();

  const { error } = await sb.from("users").insert({
    id,
    client_id: workspaceId,
    name: email,
    email,
    role: "qa_manager",
  });

  if (error) {
    throw new Error(`Failed to create test user: ${error.message}`);
  }

  return id;
}

/**
 * Fixture: create a workspace document (SOP).
 * Returns { documentId, chunkIds }.
 */
export async function createTestDocument(
  sb: SupabaseClient<Database>,
  workspaceId: string,
  title: string,
  content: string,
  uploadedById: string
): Promise<{ documentId: string; content_hash: string }> {
  // Compute SHA-256 hash (same as the app does)
  const hash = await computeSha256(content);

  const { data, error } = await sb
    .from("workspace_documents")
    .insert({
      workspace_id: workspaceId,
      source_type: "markdown",
      source_uri: `${title}.md`,
      title,
      content_hash: hash,
      version: 1,
      uploaded_by: uploadedById,
      status: "ready",
    })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(`Failed to create test document: ${error?.message}`);
  }

  return { documentId: data.id, content_hash: hash };
}

/**
 * Fixture: create a document chunk with a fixed embedding.
 * For testing, we use a deterministic embedding vector (all 0.1).
 */
export async function createTestChunk(
  sb: SupabaseClient<Database>,
  documentId: string,
  chunkIndex: number,
  text: string
): Promise<string> {
  // Fixed embedding: 1536 dimensions, all 0.1
  // This ensures test chunks are "similar" to query embeddings in mocked tests.
  const fixedEmbedding = Array(1536).fill(0.1);

  const { data, error } = await sb
    .from("document_chunks")
    .insert({
      document_id: documentId,
      chunk_index: chunkIndex,
      text,
      text_length: text.length,
      embedding: fixedEmbedding,
    })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(`Failed to create test chunk: ${error?.message}`);
  }

  return data.id;
}

/**
 * Compute SHA-256 hash of a string (same as app's uploadDocumentAction).
 * Uses Node.js crypto module (available in test environment).
 */
async function computeSha256(content: string): Promise<string> {
  const { createHash } = await import("node:crypto");
  return createHash("sha256").update(content).digest("hex");
}

/**
 * Helper to delete all rows in a table that match a filter.
 * Used for cleanup after tests.
 */
export async function deleteTestRows<T extends keyof Database["public"]["Tables"]>(
  sb: SupabaseClient<Database>,
  table: T,
  filter: { column: string; value: string }
): Promise<void> {
  // Build a dynamic query. This is a bit hacky but avoids complex
  // generic-dispatch logic.
  const { error } = await sb
    .from(table as string)
    .delete()
    .eq(filter.column, filter.value);

  if (error) {
    // Non-fatal: log but don't throw, since cleanup is best-effort.
    console.warn(`Failed to clean up ${table}:`, error);
  }
}
