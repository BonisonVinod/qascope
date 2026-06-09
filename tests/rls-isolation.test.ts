/**
 * RLS Isolation Test Suite — QAScope Multi-Tenant Security
 *
 * Proves that every sensitive table is isolated by client_id.
 * User A at Company X must NEVER be able to read or write
 * data that belongs to Company Y — even by guessing UUIDs.
 *
 * Integration test: requires live Supabase + .env.local set.
 * Run with: node --test --experimental-strip-types tests/rls-isolation.test.ts
 */

import { test } from "node:test";
import * as assert from "node:assert";
import { randomUUID } from "node:crypto";
import {
  createServiceRoleClient,
  createTestWorkspace,
} from "./_helpers/supabase-test-client.ts";
import { createClient } from "@supabase/supabase-js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function skip() {
  return (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.SUPABASE_SERVICE_ROLE_KEY ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

async function createTestUser(
  serviceSb: ReturnType<typeof createServiceRoleClient>,
  clientId: string,
  email: string,
  password: string,
  role: string = "qa_manager"
) {
  const { data, error } = await serviceSb.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error || !data.user) throw new Error(`createUser failed: ${error?.message}`);
  const userId = data.user.id;

  const { error: pubErr } = await serviceSb.from("users").insert({
    id: userId,
    client_id: clientId,
    name: email,
    email,
    role: role as any,
  });
  if (pubErr) throw new Error(`insert public.users failed: ${pubErr.message}`);
  return userId;
}

async function signInAsUser(email: string, password: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const client = createClient(url, key);
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error || !data.session) throw new Error(`signIn failed: ${error?.message}`);
  await client.auth.setSession(data.session);
  return client;
}

async function cleanupUser(
  serviceSb: ReturnType<typeof createServiceRoleClient>,
  userId: string
) {
  try {
    await serviceSb.auth.admin.deleteUser(userId);
  } catch {
    /* best effort */
  }
}

async function cleanupWorkspace(
  serviceSb: ReturnType<typeof createServiceRoleClient>,
  workspaceId: string
) {
  try {
    await serviceSb.from("clients").delete().eq("id", workspaceId);
  } catch {
    /* best effort */
  }
}

// ---------------------------------------------------------------------------
// Test 1: conversations — cross-tenant read blocked
// ---------------------------------------------------------------------------
test("rls: User A cannot read Company B's conversations", async (t) => {
  if (skip()) return t.skip("Supabase env vars not set");

  const sb = createServiceRoleClient();
  const id = randomUUID().slice(0, 8);
  const pw = "Test@123456";
  let wsA = "", wsB = "", uA = "", uB = "";

  try {
    wsA = await createTestWorkspace(sb, `__rls_a_${id}__`);
    wsB = await createTestWorkspace(sb, `__rls_b_${id}__`);
    uA = await createTestUser(sb, wsA, `ua-${id}@rls.test`, pw);
    uB = await createTestUser(sb, wsB, `ub-${id}@rls.test`, pw);

    // Seed conversation in workspace B
    const { data: agentB } = await sb.from("agents").insert({
      client_id: wsB, agent_name: "Agent B",
    }).select("id").single();

    const { data: convB } = await sb.from("conversations").insert({
      client_id: wsB,
      agent_id: agentB!.id,
      channel: "chat",
      transcript_text: "SECRET: Company B conversation",
      conversation_date: "2024-01-01",
    }).select("id").single();

    // Sign in as User A
    const clientA = await signInAsUser(`ua-${id}@rls.test`, pw);

    // Attempt to read all conversations (should get 0)
    const { data: all } = await clientA.from("conversations").select("*");
    assert.deepEqual(all, [], "User A must see 0 conversations (own workspace has none)");

    // Attempt to read Company B's conversation by exact ID
    const { data: byId } = await clientA
      .from("conversations")
      .select("*")
      .eq("id", convB!.id);
    assert.deepEqual(byId, [], "User A must NOT access Company B's conversation by ID");
  } finally {
    await cleanupUser(sb, uA);
    await cleanupUser(sb, uB);
    await cleanupWorkspace(sb, wsA);
    await cleanupWorkspace(sb, wsB);
  }
});

// ---------------------------------------------------------------------------
// Test 2: qa_scores — cross-tenant read blocked (via conversation join)
// ---------------------------------------------------------------------------
test("rls: User A cannot read Company B's qa_scores", async (t) => {
  if (skip()) return t.skip("Supabase env vars not set");

  const sb = createServiceRoleClient();
  const id = randomUUID().slice(0, 8);
  const pw = "Test@123456";
  let wsA = "", wsB = "", uA = "", uB = "";

  try {
    wsA = await createTestWorkspace(sb, `__rls2a_${id}__`);
    wsB = await createTestWorkspace(sb, `__rls2b_${id}__`);
    uA = await createTestUser(sb, wsA, `u2a-${id}@rls.test`, pw);
    uB = await createTestUser(sb, wsB, `u2b-${id}@rls.test`, pw);

    // Seed rubric + conversation + score in workspace B
    const { data: rubricB } = await sb.from("qa_rubrics").insert({
      client_id: wsB, name: "Rubric B", is_default: true,
    }).select("id").single();

    const { data: convB } = await sb.from("conversations").insert({
      client_id: wsB, channel: "chat",
      transcript_text: "B conversation", conversation_date: "2024-01-01",
    }).select("id").single();

    const { data: scoreB } = await sb.from("qa_scores").insert({
      conversation_id: convB!.id, rubric_id: rubricB!.id,
      total_score: 88, confidence_score: 0.9,
      status: "final", original_total_score: 88, original_status: "final",
    }).select("id").single();

    const clientA = await signInAsUser(`u2a-${id}@rls.test`, pw);

    const { data: allScores } = await clientA.from("qa_scores").select("*");
    assert.deepEqual(allScores, [], "User A must see 0 qa_scores");

    const { data: byId } = await clientA.from("qa_scores").select("*").eq("id", scoreB!.id);
    assert.deepEqual(byId, [], "User A cannot fetch Company B's score by ID");
  } finally {
    await cleanupUser(sb, uA);
    await cleanupUser(sb, uB);
    await cleanupWorkspace(sb, wsA);
    await cleanupWorkspace(sb, wsB);
  }
});

// ---------------------------------------------------------------------------
// Test 3: review_queue — cross-tenant read blocked
// ---------------------------------------------------------------------------
test("rls: User A cannot read Company B's review_queue", async (t) => {
  if (skip()) return t.skip("Supabase env vars not set");

  const sb = createServiceRoleClient();
  const id = randomUUID().slice(0, 8);
  const pw = "Test@123456";
  let wsA = "", wsB = "", uA = "", uB = "";

  try {
    wsA = await createTestWorkspace(sb, `__rls3a_${id}__`);
    wsB = await createTestWorkspace(sb, `__rls3b_${id}__`);
    uA = await createTestUser(sb, wsA, `u3a-${id}@rls.test`, pw);
    uB = await createTestUser(sb, wsB, `u3b-${id}@rls.test`, pw);

    const { data: rubricB } = await sb.from("qa_rubrics").insert({
      client_id: wsB, name: "Rubric B", is_default: true,
    }).select("id").single();

    const { data: convB } = await sb.from("conversations").insert({
      client_id: wsB, channel: "chat",
      transcript_text: "B conversation", conversation_date: "2024-01-01",
    }).select("id").single();

    const { data: scoreB } = await sb.from("qa_scores").insert({
      conversation_id: convB!.id, rubric_id: rubricB!.id,
      total_score: 45, confidence_score: 0.6,
      status: "needs_review", original_total_score: 45, original_status: "needs_review",
    }).select("id").single();

    const { data: rqB } = await sb.from("review_queue").insert({
      qa_score_id: scoreB!.id, reason: "low_score", state: "pending_first",
    }).select("id").single();

    const clientA = await signInAsUser(`u3a-${id}@rls.test`, pw);

    const { data: all } = await clientA.from("review_queue").select("*");
    assert.deepEqual(all, [], "User A must see 0 review_queue rows");

    const { data: byId } = await clientA.from("review_queue").select("*").eq("id", rqB!.id);
    assert.deepEqual(byId, [], "User A cannot access Company B's review queue item by ID");
  } finally {
    await cleanupUser(sb, uA);
    await cleanupUser(sb, uB);
    await cleanupWorkspace(sb, wsA);
    await cleanupWorkspace(sb, wsB);
  }
});

// ---------------------------------------------------------------------------
// Test 4: agents — cross-tenant read blocked
// ---------------------------------------------------------------------------
test("rls: User A cannot read Company B's agents", async (t) => {
  if (skip()) return t.skip("Supabase env vars not set");

  const sb = createServiceRoleClient();
  const id = randomUUID().slice(0, 8);
  const pw = "Test@123456";
  let wsA = "", wsB = "", uA = "", uB = "";

  try {
    wsA = await createTestWorkspace(sb, `__rls4a_${id}__`);
    wsB = await createTestWorkspace(sb, `__rls4b_${id}__`);
    uA = await createTestUser(sb, wsA, `u4a-${id}@rls.test`, pw);
    uB = await createTestUser(sb, wsB, `u4b-${id}@rls.test`, pw);

    const { data: agentB } = await sb.from("agents").insert({
      client_id: wsB, agent_name: "Secret Agent B",
    }).select("id").single();

    const clientA = await signInAsUser(`u4a-${id}@rls.test`, pw);

    const { data: all } = await clientA.from("agents").select("*");
    assert.deepEqual(all, [], "User A sees 0 agents");

    const { data: byId } = await clientA.from("agents").select("*").eq("id", agentB!.id);
    assert.deepEqual(byId, [], "User A cannot access Company B's agent by ID");
  } finally {
    await cleanupUser(sb, uA);
    await cleanupUser(sb, uB);
    await cleanupWorkspace(sb, wsA);
    await cleanupWorkspace(sb, wsB);
  }
});

// ---------------------------------------------------------------------------
// Test 5: webhook_tokens — cross-tenant read blocked
// ---------------------------------------------------------------------------
test("rls: User A cannot read Company B's webhook_tokens", async (t) => {
  if (skip()) return t.skip("Supabase env vars not set");

  const sb = createServiceRoleClient();
  const id = randomUUID().slice(0, 8);
  const pw = "Test@123456";
  let wsA = "", wsB = "", uA = "", uB = "";

  try {
    wsA = await createTestWorkspace(sb, `__rls5a_${id}__`);
    wsB = await createTestWorkspace(sb, `__rls5b_${id}__`);
    uA = await createTestUser(sb, wsA, `u5a-${id}@rls.test`, pw);
    uB = await createTestUser(sb, wsB, `u5b-${id}@rls.test`, pw);

    const { data: tokenB } = await sb.from("webhook_tokens").insert({
      client_id: wsB,
      name: "Company B's Secret Token",
      token: randomUUID().replace(/-/g, ""),
      is_active: true,
    }).select("id").single();

    const clientA = await signInAsUser(`u5a-${id}@rls.test`, pw);

    const { data: all } = await clientA.from("webhook_tokens").select("*");
    assert.deepEqual(all, [], "User A sees 0 webhook_tokens");

    const { data: byId } = await clientA.from("webhook_tokens").select("*").eq("id", tokenB!.id);
    assert.deepEqual(byId, [], "User A cannot access Company B's webhook token by ID");
  } finally {
    await cleanupUser(sb, uA);
    await cleanupUser(sb, uB);
    await cleanupWorkspace(sb, wsA);
    await cleanupWorkspace(sb, wsB);
  }
});

// ---------------------------------------------------------------------------
// Test 6: data_sources — cross-tenant read blocked
// ---------------------------------------------------------------------------
test("rls: User A cannot read Company B's data_sources", async (t) => {
  if (skip()) return t.skip("Supabase env vars not set");

  const sb = createServiceRoleClient();
  const id = randomUUID().slice(0, 8);
  const pw = "Test@123456";
  let wsA = "", wsB = "", uA = "", uB = "";

  try {
    wsA = await createTestWorkspace(sb, `__rls6a_${id}__`);
    wsB = await createTestWorkspace(sb, `__rls6b_${id}__`);
    uA = await createTestUser(sb, wsA, `u6a-${id}@rls.test`, pw);
    uB = await createTestUser(sb, wsB, `u6b-${id}@rls.test`, pw);

    const { data: dsB } = await sb.from("data_sources").insert({
      client_id: wsB,
      name: "B Order API",
      type: "api_endpoint",
      endpoint_template: "https://secret-api.companyb.com/orders/{order_id}",
      entity_hints: ["order_id"],
      is_active: true,
    }).select("id").single();

    const clientA = await signInAsUser(`u6a-${id}@rls.test`, pw);

    const { data: all } = await clientA.from("data_sources").select("*");
    assert.deepEqual(all, [], "User A sees 0 data_sources");

    const { data: byId } = await clientA.from("data_sources").select("*").eq("id", dsB!.id);
    assert.deepEqual(byId, [], "User A cannot access Company B's data source by ID");
  } finally {
    await cleanupUser(sb, uA);
    await cleanupUser(sb, uB);
    await cleanupWorkspace(sb, wsA);
    await cleanupWorkspace(sb, wsB);
  }
});

// ---------------------------------------------------------------------------
// Test 7: WRITE isolation — User A cannot INSERT into Company B's workspace
// ---------------------------------------------------------------------------
test("rls: User A cannot INSERT a conversation into Company B", async (t) => {
  if (skip()) return t.skip("Supabase env vars not set");

  const sb = createServiceRoleClient();
  const id = randomUUID().slice(0, 8);
  const pw = "Test@123456";
  let wsA = "", wsB = "", uA = "", uB = "";

  try {
    wsA = await createTestWorkspace(sb, `__rls7a_${id}__`);
    wsB = await createTestWorkspace(sb, `__rls7b_${id}__`);
    uA = await createTestUser(sb, wsA, `u7a-${id}@rls.test`, pw);
    uB = await createTestUser(sb, wsB, `u7b-${id}@rls.test`, pw);

    const clientA = await signInAsUser(`u7a-${id}@rls.test`, pw);

    // Try to INSERT a conversation directly into Company B's workspace
    const { data, error } = await clientA.from("conversations").insert({
      client_id: wsB,           // ← Company B's ID — should be blocked
      channel: "chat",
      transcript_text: "Injected by attacker",
      conversation_date: "2024-01-01",
    }).select();

    // RLS WITH CHECK blocks this — either returns error or empty data
    const blocked = !!error || (Array.isArray(data) && data.length === 0);
    assert.ok(blocked, "RLS must block User A from inserting into Company B");
  } finally {
    await cleanupUser(sb, uA);
    await cleanupUser(sb, uB);
    await cleanupWorkspace(sb, wsA);
    await cleanupWorkspace(sb, wsB);
  }
});

// ---------------------------------------------------------------------------
// Test 8: users table — User A cannot read Company B's user list
// ---------------------------------------------------------------------------
test("rls: User A cannot read Company B's user list", async (t) => {
  if (skip()) return t.skip("Supabase env vars not set");

  const sb = createServiceRoleClient();
  const id = randomUUID().slice(0, 8);
  const pw = "Test@123456";
  let wsA = "", wsB = "", uA = "", uB = "";

  try {
    wsA = await createTestWorkspace(sb, `__rls8a_${id}__`);
    wsB = await createTestWorkspace(sb, `__rls8b_${id}__`);
    uA = await createTestUser(sb, wsA, `u8a-${id}@rls.test`, pw);
    uB = await createTestUser(sb, wsB, `u8b-${id}@rls.test`, pw);

    const clientA = await signInAsUser(`u8a-${id}@rls.test`, pw);

    // User A can see their own workspace users
    const { data: ownUsers } = await clientA.from("users").select("id, email");
    assert.ok(ownUsers?.length === 1, "User A sees exactly 1 user (themselves)");
    assert.ok(ownUsers![0].email === `u8a-${id}@rls.test`, "User A sees their own record");

    // User A must NOT see Company B's users
    const { data: bUsers } = await clientA
      .from("users")
      .select("id")
      .eq("id", uB);
    assert.deepEqual(bUsers, [], "User A cannot see Company B's user record");
  } finally {
    await cleanupUser(sb, uA);
    await cleanupUser(sb, uB);
    await cleanupWorkspace(sb, wsA);
    await cleanupWorkspace(sb, wsB);
  }
});

// ---------------------------------------------------------------------------
// Test 9: clients table — User A cannot read Company B's client row
// ---------------------------------------------------------------------------
test("rls: User A cannot read Company B's client row", async (t) => {
  if (skip()) return t.skip("Supabase env vars not set");

  const sb = createServiceRoleClient();
  const id = randomUUID().slice(0, 8);
  const pw = "Test@123456";
  let wsA = "", wsB = "", uA = "", uB = "";

  try {
    wsA = await createTestWorkspace(sb, `__rls9a_${id}__`);
    wsB = await createTestWorkspace(sb, `__rls9b_${id}__`);
    uA = await createTestUser(sb, wsA, `u9a-${id}@rls.test`, pw);
    uB = await createTestUser(sb, wsB, `u9b-${id}@rls.test`, pw);

    const clientA = await signInAsUser(`u9a-${id}@rls.test`, pw);

    // User A can see their own client
    const { data: ownClient } = await clientA.from("clients").select("id").eq("id", wsA);
    assert.ok(ownClient?.length === 1, "User A can read their own client row");

    // User A cannot see Company B's client
    const { data: bClient } = await clientA.from("clients").select("id").eq("id", wsB);
    assert.deepEqual(bClient, [], "User A cannot read Company B's client row");
  } finally {
    await cleanupUser(sb, uA);
    await cleanupUser(sb, uB);
    await cleanupWorkspace(sb, wsA);
    await cleanupWorkspace(sb, wsB);
  }
});
