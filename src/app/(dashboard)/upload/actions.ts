"use server";

import Papa from "papaparse";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ChannelType } from "@/lib/database.types";
import {
  normalizeChannel,
  normalizeDate,
  validateMapping,
  type ColumnMapping,
} from "@/lib/upload/column-mapping";

export type RowError = { row: number; conversationId?: string; message: string };

export type UploadState =
  | undefined
  | {
      ok: true;
      successCount: number;
      failCount: number;
      skippedDuplicates: number;
      errors: RowError[];
      totalRows: number;
    }
  | { ok: false; error: string };

// Channel string -> enum. Accept a few common aliases.
const channelMap: Record<string, ChannelType> = {
  chat: "chat",
  email: "email",
  voice: "voice_transcript",
  voice_transcript: "voice_transcript",
  call: "voice_transcript",
  transcript: "voice_transcript",
};

const rowSchema = z.object({
  // Auto-generated when not present after mapping; we accept any non-empty string.
  conversation_id: z.string().trim().min(1),
  agent_name: z.string().trim().min(1, "agent_name is required"),
  team_name: z.string().trim().optional().default(""),
  channel: z
    .string()
    .trim()
    .toLowerCase()
    .refine((c) => c in channelMap, {
      message: "channel must be one of: chat, email, voice_transcript",
    })
    .transform((c) => channelMap[c]),
  transcript_text: z
    .string()
    .trim()
    .min(10, "transcript_text must be at least 10 characters"),
  conversation_date: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "conversation_date must be YYYY-MM-DD"),
  customer_id: z.string().trim().optional().default(""),
});

/**
 * Apply a ColumnMapping to a raw CSV row, producing a canonical row shape
 * the rowSchema expects. Values are pulled from the mapped column or the
 * fixed-value field. Missing conversation_id auto-generates a UUID.
 */
function applyMapping(
  raw: Record<string, string>,
  mapping: ColumnMapping,
): Record<string, string> {
  // Header lookup is case-sensitive against the mapping keys; PapaParse
  // headers were already lowercased in the parse step, so the mapping
  // values must match that. We lowercase the mapping references here.
  const get = (col: string): string => {
    if (!col) return "";
    const lower = col.trim().toLowerCase();
    return String(raw[lower] ?? "").trim();
  };
  const channelRaw = mapping.channel
    ? get(mapping.channel)
    : (mapping.fixedChannel ?? "");
  const channel = mapping.channel
    ? (normalizeChannel(channelRaw) ?? channelRaw)
    : (mapping.fixedChannel ?? "");
  const dateRaw = mapping.conversation_date
    ? get(mapping.conversation_date)
    : (mapping.fixedDate ?? "");
  const date = mapping.conversation_date
    ? (normalizeDate(dateRaw) ?? dateRaw)
    : (mapping.fixedDate ?? "");
  return {
    conversation_id:
      get(mapping.conversation_id) || `auto-${randomUUID()}`,
    agent_name: get(mapping.agent_name),
    team_name: get(mapping.team_name),
    channel,
    transcript_text: get(mapping.transcript_text),
    conversation_date: date,
    customer_id: get(mapping.customer_id),
  };
}

type RawRow = Record<string, string>;

export async function uploadConversations(
  _prev: UploadState,
  formData: FormData,
): Promise<UploadState> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Please choose a CSV file." };
  }
  if (file.size > 10 * 1024 * 1024) {
    return { ok: false, error: "File too large. Max 10 MB." };
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
    .select("client_id")
    .eq("id", user.id)
    .single();
  if (appUserErr || !appUser) {
    return { ok: false, error: "Could not load your account." };
  }
  const clientId = appUser.client_id;

  // No conversation cap. Plans differ on features, not volume — see
  // /billing for the active feature matrix. We still log every upload's
  // size in openai_usage so admins can see throughput, but uploads are
  // never blocked on volume here.

  // Parse CSV
  const text = await file.text();
  const parsed = Papa.parse<RawRow>(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim().toLowerCase(),
  });

  if (parsed.errors.length > 0) {
    return {
      ok: false,
      error: `CSV parse error: ${parsed.errors[0].message} (row ${parsed.errors[0].row ?? "?"})`,
    };
  }

  const rows = parsed.data ?? [];
  if (rows.length === 0) {
    return { ok: false, error: "CSV has no data rows." };
  }
  if (rows.length > 5000) {
    return { ok: false, error: "Too many rows. Max 5000 per upload." };
  }

  // Read the column mapping (optional). When absent, we fall back to the
  // canonical column names — same as before so old workflows still work.
  let mapping: ColumnMapping | null = null;
  const mappingRaw = formData.get("mapping");
  if (typeof mappingRaw === "string" && mappingRaw.trim().length > 0) {
    try {
      mapping = JSON.parse(mappingRaw) as ColumnMapping;
      const v = validateMapping(mapping);
      if (!v.ok) {
        return { ok: false, error: v.reasons.join(" ") };
      }
    } catch {
      return { ok: false, error: "Invalid column mapping payload." };
    }
  }

  // Validate rows. If a mapping is provided, translate raw row → canonical
  // shape first; otherwise we expect canonical column names already.
  const validRows: {
    rowIndex: number;
    data: z.infer<typeof rowSchema>;
  }[] = [];
  const errors: RowError[] = [];

  rows.forEach((r, i) => {
    const canonical = mapping ? applyMapping(r, mapping) : r;
    const result = rowSchema.safeParse(canonical);
    if (!result.success) {
      errors.push({
        row: i + 2, // +2: 1 for header, 1 for 1-based index
        conversationId: canonical.conversation_id,
        message: result.error.issues.map((x) => x.message).join("; "),
      });
    } else {
      validRows.push({ rowIndex: i + 2, data: result.data });
    }
  });

  if (validRows.length === 0) {
    return {
      ok: true,
      successCount: 0,
      failCount: errors.length,
      skippedDuplicates: 0,
      errors: errors.slice(0, 50),
      totalRows: rows.length,
    };
  }

  // Dedupe existing conversations by (client_id, external_conversation_id)
  const externalIds = validRows.map((r) => r.data.conversation_id);
  const { data: existing } = await supabase
    .from("conversations")
    .select("external_conversation_id")
    .eq("client_id", clientId)
    .in("external_conversation_id", externalIds);

  const existingSet = new Set(
    (existing ?? [])
      .map((e) => e.external_conversation_id)
      .filter((x): x is string => !!x),
  );

  let skippedDuplicates = 0;
  const toInsertRows = validRows.filter((r) => {
    if (existingSet.has(r.data.conversation_id)) {
      skippedDuplicates += 1;
      return false;
    }
    return true;
  });

  // Upsert agents — build unique agent keys and lookup / insert.
  //   Our table allows multiple agents with same name (different teams),
  //   so we key by (agent_name, team_name).
  const agentKey = (name: string, team: string) => `${name}\u0000${team}`;
  const uniqueAgents = new Map<string, { agent_name: string; team_name: string }>();
  for (const r of toInsertRows) {
    const k = agentKey(r.data.agent_name, r.data.team_name);
    if (!uniqueAgents.has(k)) {
      uniqueAgents.set(k, {
        agent_name: r.data.agent_name,
        team_name: r.data.team_name,
      });
    }
  }

  // Fetch existing agents that match
  const agentNames = [...new Set([...uniqueAgents.values()].map((a) => a.agent_name))];
  const { data: existingAgents, error: fetchAgentsErr } = await supabase
    .from("agents")
    .select("id, agent_name, team_name")
    .eq("client_id", clientId)
    .in("agent_name", agentNames);
  if (fetchAgentsErr) {
    return { ok: false, error: `Could not load agents: ${fetchAgentsErr.message}` };
  }

  const agentIdByKey = new Map<string, string>();
  for (const a of existingAgents ?? []) {
    agentIdByKey.set(agentKey(a.agent_name, a.team_name ?? ""), a.id);
  }

  // Insert missing agents
  const toCreateAgents = [...uniqueAgents.entries()]
    .filter(([k]) => !agentIdByKey.has(k))
    .map(([, v]) => ({
      client_id: clientId,
      agent_name: v.agent_name,
      team_name: v.team_name === "" ? null : v.team_name,
    }));

  if (toCreateAgents.length > 0) {
    const { data: created, error: createErr } = await supabase
      .from("agents")
      .insert(toCreateAgents)
      .select("id, agent_name, team_name");
    if (createErr) {
      return { ok: false, error: `Could not create agents: ${createErr.message}` };
    }
    for (const a of created ?? []) {
      agentIdByKey.set(agentKey(a.agent_name, a.team_name ?? ""), a.id);
    }
  }

  // Tag every row in this upload with a single batch id. Used by the
  // "Latest upload only" filter on Results / Review queue so the user can
  // hide everything they've already audited from earlier uploads.
  const uploadBatchId = randomUUID();

  // Build conversation inserts
  const conversationInserts = toInsertRows
    .map((r) => {
      const aid = agentIdByKey.get(agentKey(r.data.agent_name, r.data.team_name));
      if (!aid) {
        errors.push({
          row: r.rowIndex,
          conversationId: r.data.conversation_id,
          message: "Could not resolve agent (internal error)",
        });
        return null;
      }
      return {
        client_id: clientId,
        agent_id: aid,
        channel: r.data.channel,
        transcript_text: r.data.transcript_text,
        conversation_date: r.data.conversation_date,
        customer_id: r.data.customer_id === "" ? null : r.data.customer_id,
        external_conversation_id: r.data.conversation_id,
        upload_batch_id: uploadBatchId,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  let successCount = 0;
  if (conversationInserts.length > 0) {
    // Batch inserts in chunks of 500
    const CHUNK = 500;
    for (let i = 0; i < conversationInserts.length; i += CHUNK) {
      const chunk = conversationInserts.slice(i, i + CHUNK);
      const { error: insertErr, count } = await supabase
        .from("conversations")
        .insert(chunk, { count: "exact" });
      if (insertErr) {
        // Whole chunk failed — record one error per row in the chunk
        for (const row of chunk) {
          errors.push({
            row: 0,
            conversationId: row.external_conversation_id ?? undefined,
            message: insertErr.message,
          });
        }
      } else {
        successCount += count ?? chunk.length;
      }
    }
  }

  // Bump the workspace's "latest upload batch" pointer if at least one row
  // was actually inserted. clients has SELECT-only RLS for tenant users, so
  // we use the admin client (same pattern as the Stop flag).
  if (successCount > 0) {
    const admin = createAdminClient();
    await admin
      .from("clients")
      .update({ latest_upload_batch_id: uploadBatchId })
      .eq("id", clientId);
  }

  revalidatePath("/upload");
  revalidatePath("/results");
  revalidatePath("/review-queue");

  return {
    ok: true,
    successCount,
    failCount: errors.length,
    skippedDuplicates,
    errors: errors.slice(0, 50),
    totalRows: rows.length,
  };
}
