"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

async function getAdminClient() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
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

export async function createDataSource(formData: FormData) {
  const name = (formData.get("name") as string | null)?.trim();
  const type = formData.get("type") as "website_url" | "api_endpoint" | null;
  const url = (formData.get("url") as string | null)?.trim() || null;
  const endpointTemplate =
    (formData.get("endpoint_template") as string | null)?.trim() || null;
  const httpMethod =
    (formData.get("http_method") as "GET" | "POST" | null) ?? "GET";
  const authHeaderName =
    (formData.get("auth_header_name") as string | null)?.trim() || null;
  const entityHintsRaw =
    (formData.get("entity_hints") as string | null) ?? "";
  const entityHints = entityHintsRaw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (!name) return { error: "Name is required" };
  if (!type) return { error: "Type is required" };
  if (type === "website_url" && !url)
    return { error: "URL is required for website type" };
  if (type === "api_endpoint" && !endpointTemplate)
    return { error: "Endpoint template is required for API type" };

  try {
    const { supabase, user, appUser } = await getAdminClient();

    const { error } = await supabase.from("data_sources").insert({
      client_id: appUser.client_id,
      name,
      type,
      url,
      endpoint_template: endpointTemplate,
      http_method: httpMethod,
      auth_header_name: authHeaderName,
      entity_hints: entityHints,
      is_active: true,
      created_by: user.id,
    });

    if (error) return { error: error.message };
    revalidatePath("/settings");
    return { ok: true };
  } catch (err) {
    return { error: (err as Error).message };
  }
}

export async function toggleDataSource(id: string, isActive: boolean) {
  try {
    const { supabase, appUser } = await getAdminClient();
    const { error } = await supabase
      .from("data_sources")
      .update({ is_active: isActive })
      .eq("id", id)
      .eq("client_id", appUser.client_id);
    if (error) return { error: error.message };
    revalidatePath("/settings");
    return { ok: true };
  } catch (err) {
    return { error: (err as Error).message };
  }
}

export async function deleteDataSource(id: string) {
  try {
    const { supabase, appUser } = await getAdminClient();
    const { error } = await supabase
      .from("data_sources")
      .delete()
      .eq("id", id)
      .eq("client_id", appUser.client_id);
    if (error) return { error: error.message };
    revalidatePath("/settings");
    return { ok: true };
  } catch (err) {
    return { error: (err as Error).message };
  }
}
