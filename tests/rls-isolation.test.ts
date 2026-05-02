/**
 * RLS Isolation Test for Knowledge Store
 * Proves that workspace A cannot SELECT document_chunks from workspace B.
 * (Integration test — requires live Supabase with .env.local set.)
 */

import { test } from "node:test";
import * as assert from "node:assert";
import { randomUUID } from "node:crypto";
import {
  createServiceRoleClient,
  createTestWorkspace,
  createTestDocument,
  createTestChunk,
} from "./_helpers/supabase-test-client.ts";

test("rls-isolation: workspace A cannot read workspace B's document_chunks", async (t) => {
  // Skip if env vars not set
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.SUPABASE_SERVICE_ROLE_KEY ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    t.skip("Supabase env vars not set — skipping RLS integration test");
    return;
  }

  const serviceSb = createServiceRoleClient();
  const testId = randomUUID().slice(0, 8);
  const workspaceAName = `__test_rls_a_${testId}__`;
  const workspaceBName = `__test_rls_b_${testId}__`;
  const userAEmail = `test-user-a-${testId}@qascope.test`;
  const userBEmail = `test-user-b-${testId}@qascope.test`;
  const testPassword = "Test@Password123";

  let workspaceA: string, workspaceB: string, userAId: string, userBId: string;

  try {
    // 1. Create workspaces A and B (service role)
    workspaceA = await createTestWorkspace(serviceSb, workspaceAName);
    workspaceB = await createTestWorkspace(serviceSb, workspaceBName);

    // 2. Create users via auth.admin, then insert public.users rows
    const authAdmin = serviceSb.auth.admin;

    const { data: authUserA, error: errA } = await authAdmin.createUser({
      email: userAEmail,
      password: testPassword,
      email_confirm: true,
    });
    assert.ok(!errA && authUserA?.user, `Failed to create auth user A: ${errA?.message}`);
    userAId = authUserA!.user!.id;

    const { data: authUserB, error: errB } = await authAdmin.createUser({
      email: userBEmail,
      password: testPassword,
      email_confirm: true,
    });
    assert.ok(!errB && authUserB?.user, `Failed to create auth user B: ${errB?.message}`);
    userBId = authUserB!.user!.id;

    // Insert public.users rows
    const { error: pubUserAErr } = await serviceSb.from("users").insert({
      id: userAId,
      client_id: workspaceA,
      name: userAEmail,
      email: userAEmail,
      role: "qa_manager",
    });
    assert.ok(!pubUserAErr, `Failed to insert public user A: ${pubUserAErr?.message}`);

    const { error: pubUserBErr } = await serviceSb.from("users").insert({
      id: userBId,
      client_id: workspaceB,
      name: userBEmail,
      email: userBEmail,
      role: "qa_manager",
    });
    assert.ok(!pubUserBErr, `Failed to insert public user B: ${pubUserBErr?.message}`);

    // 3. Insert a document and chunk for workspace B (service role)
    const docBResult = await createTestDocument(
      serviceSb,
      workspaceB,
      "Test SOP for B",
      "This is workspace B's secret SOP.",
      userBId
    );
    const docBId = docBResult.documentId;

    const chunkBId = await createTestChunk(
      serviceSb,
      docBId,
      0,
      "Workspace B's confidential procedure."
    );

    // 4. Sign in as user A (anon-key client + signInWithPassword to get JWT)
    const anonUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const { createClient } = await import("@supabase/supabase-js");
    const anonClient = createClient(anonUrl, anonKey);

    const { data: sessionA, error: signInErr } = await anonClient.auth.signInWithPassword({
      email: userAEmail,
      password: testPassword,
    });
    assert.ok(!signInErr && sessionA?.session, `Failed to sign in as user A: ${signInErr?.message}`);

    // 5. Set user A's session on a new client instance
    const userAClient = createClient(anonUrl, anonKey);
    const { error: setSessionErr } = await userAClient.auth.setSession(sessionA!.session!);
    assert.ok(!setSessionErr, `Failed to set user A session: ${setSessionErr?.message}`);

    // 6. As user A, try to query workspace B's document chunks
    const { data: chunks, error: queryErr } = await userAClient
      .from("document_chunks")
      .select("*")
      .eq("document_id", docBId);

    // 7. Assert RLS blocked it
    assert.ok(!queryErr, `Query error (should be blocked by RLS): ${queryErr?.message}`);
    assert.deepEqual(chunks, [], "User A should NOT see workspace B's chunks (RLS should hide them)");
  } finally {
    // Cleanup: delete in FK-safe order
    if (userAId) {
      try {
        await serviceSb.auth.admin.deleteUser(userAId);
      } catch (e) {
        console.warn("Failed to delete auth user A:", e);
      }
    }
    if (userBId) {
      try {
        await serviceSb.auth.admin.deleteUser(userBId);
      } catch (e) {
        console.warn("Failed to delete auth user B:", e);
      }
    }
    // Workspaces + their documents/chunks cascade-delete
    if (workspaceA) {
      try {
        await serviceSb.from("clients").delete().eq("id", workspaceA);
      } catch (e) {
        console.warn("Failed to delete workspace A:", e);
      }
    }
    if (workspaceB) {
      try {
        await serviceSb.from("clients").delete().eq("id", workspaceB);
      } catch (e) {
        console.warn("Failed to delete workspace B:", e);
      }
    }
  }
});
