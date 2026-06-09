"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import crypto from "crypto";

export async function createOutboundWebhook(formData: FormData) {
  const supabase = await createClient();
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData.user) return { error: "Unauthorized" };

  const { data: userRow } = await supabase
    .from("users")
    .select("client_id, role")
    .eq("id", userData.user.id)
    .single();

  if (!userRow || !["admin", "qa_manager"].includes(userRow.role)) {
    return { error: "Permission denied. Admins only." };
  }

  const url = formData.get("url")?.toString()?.trim();
  if (!url) return { error: "URL is required" };

  try {
    new URL(url);
  } catch {
    return { error: "Invalid URL format" };
  }

  // Generate a random secure secret for HMAC signing
  const secret = crypto.randomBytes(32).toString("hex");

  const { data: hook, error: insertErr } = await supabase
    .from("outbound_webhooks")
    .insert({
      client_id: userRow.client_id,
      url,
      secret,
    })
    .select()
    .single();

  if (insertErr || !hook) {
    console.error("Failed to insert outbound webhook:", insertErr);
    return { error: "Failed to create webhook" };
  }

  revalidatePath("/settings");
  return { success: true, secret };
}

export async function deleteOutboundWebhook(webhookId: string) {
  const supabase = await createClient();
  const { data: userRow } = await supabase
    .from("users")
    .select("client_id, role")
    .eq("id", (await supabase.auth.getUser()).data.user?.id || "")
    .single();

  if (!userRow || !["admin", "qa_manager"].includes(userRow.role)) return;

  await supabase
    .from("outbound_webhooks")
    .delete()
    .eq("id", webhookId)
    .eq("client_id", userRow.client_id);

  revalidatePath("/settings");
}

export async function toggleOutboundWebhook(webhookId: string, isActive: boolean) {
  const supabase = await createClient();
  const { data: userRow } = await supabase
    .from("users")
    .select("client_id, role")
    .eq("id", (await supabase.auth.getUser()).data.user?.id || "")
    .single();

  if (!userRow || !["admin", "qa_manager"].includes(userRow.role)) return;

  await supabase
    .from("outbound_webhooks")
    .update({ is_active: isActive })
    .eq("id", webhookId)
    .eq("client_id", userRow.client_id);

  revalidatePath("/settings");
}
