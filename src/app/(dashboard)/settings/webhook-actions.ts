"use server";

import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

async function getAdminClient() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const { data: appUser } = await supabase
    .from("users")
    .select("client_id, role")
    .eq("id", user.id)
    .single();
  if (!appUser || !["admin", "qa_manager"].includes(appUser.role)) {
    throw new Error("Insufficient permissions");
  }
  return { supabase, user, appUser };
}

export async function createWebhookToken(formData: FormData) {
  const name = (formData.get("name") as string | null)?.trim();
  if (!name) return { error: "Name is required" };
  try {
    const { supabase, user, appUser } = await getAdminClient();
    const token = randomBytes(32).toString("hex");
    const signingSecret = randomBytes(32).toString("hex");
    const { error } = await supabase.from("webhook_tokens").insert({
      client_id: appUser.client_id,
      name,
      token,
      signing_secret: signingSecret,
      allow_unsigned: false,
      created_by: user.id,
      is_active: true,
    });
    if (error) return { error: error.message };
    revalidatePath("/settings");
    return { ok: true, token, signingSecret };
  } catch (err) {
    return { error: (err as Error).message };
  }
}

export async function setWebhookUnsignedMode(tokenId: string, allowUnsigned: boolean) {
  try {
    const { supabase, appUser } = await getAdminClient();
    const { error } = await supabase
      .from("webhook_tokens")
      .update({ allow_unsigned: allowUnsigned })
      .eq("id", tokenId)
      .eq("client_id", appUser.client_id);
    if (error) return { error: error.message };
    revalidatePath("/settings");
    return { ok: true };
  } catch (err) {
    return { error: (err as Error).message };
  }
}

export async function revokeWebhookToken(tokenId: string) {
  try {
    const { supabase, appUser } = await getAdminClient();
    const { error } = await supabase
      .from("webhook_tokens")
      .update({ is_active: false })
      .eq("id", tokenId)
      .eq("client_id", appUser.client_id);
    if (error) return { error: error.message };
    revalidatePath("/settings");
    return { ok: true };
  } catch (err) {
    return { error: (err as Error).message };
  }
}

export async function deleteWebhookToken(tokenId: string) {
  try {
    const { supabase, appUser } = await getAdminClient();
    const { error } = await supabase
      .from("webhook_tokens")
      .delete()
      .eq("id", tokenId)
      .eq("client_id", appUser.client_id);
    if (error) return { error: error.message };
    revalidatePath("/settings");
    return { ok: true };
  } catch (err) {
    return { error: (err as Error).message };
  }
}
