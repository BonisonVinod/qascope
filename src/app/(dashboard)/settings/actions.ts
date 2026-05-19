"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type SettingsActionState =
  | undefined
  | { ok: true; message: string }
  | { ok: false; error: string };

/**
 * Save the client's review-workflow config: who the second reviewer is,
 * SLA hours per tier, pass threshold, and review-confidence threshold.
 *
 * The clients table has SELECT-only RLS for tenant users, so the
 * UPDATE has to go through the admin (service-role) Supabase client
 * — otherwise it silently affects 0 rows. Authorization is enforced
 * here in code (admin/qa_manager only) and the update is scoped to the
 * user's own client_id.
 */
export async function saveReviewSettings(
  _prev: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const { data: me } = await supabase
    .from("users")
    .select("role, client_id")
    .eq("id", user.id)
    .single();
  if (!me) return { ok: false, error: "Your user record is missing." };
  if (me.role !== "admin" && me.role !== "qa_manager") {
    return { ok: false, error: "Only admins and QA managers can change these settings." };
  }
  if (!me.client_id) return { ok: false, error: "No client associated with your account." };

  const rawSecond = String(formData.get("secondReviewer") ?? "").trim();
  const rawHours = String(formData.get("slaHours") ?? "").trim();
  const rawPass = String(formData.get("passThreshold") ?? "").trim();
  const rawConf = String(formData.get("reviewConfidenceThreshold") ?? "").trim();

  const secondReviewer = rawSecond.length === 0 ? null : rawSecond;
  const hoursNum = Number(rawHours);
  if (!Number.isFinite(hoursNum) || hoursNum < 1 || hoursNum > 168) {
    return { ok: false, error: "SLA hours must be between 1 and 168 (7 days)." };
  }
  const passNum = Number(rawPass);
  if (!Number.isFinite(passNum) || passNum < 0 || passNum > 100) {
    return { ok: false, error: "Pass threshold must be between 0 and 100." };
  }
  const confNum = Number(rawConf);
  if (!Number.isFinite(confNum) || confNum < 0 || confNum > 100) {
    return { ok: false, error: "Confidence threshold must be between 0 and 100." };
  }

  // If a second reviewer was picked, verify they belong to this client.
  if (secondReviewer) {
    const { data: picked } = await supabase
      .from("users")
      .select("id, client_id")
      .eq("id", secondReviewer)
      .single();
    if (!picked || picked.client_id !== me.client_id) {
      return { ok: false, error: "Selected reviewer is not in this workspace." };
    }
  }

  const admin = createAdminClient();
  const { error: updErr } = await admin
    .from("clients")
    .update({
      second_reviewer_user_id: secondReviewer,
      sla_hours: Math.round(hoursNum),
      pass_threshold: Math.round(passNum),
      review_confidence_threshold: Math.round(confNum),
    })
    .eq("id", me.client_id);
  if (updErr) return { ok: false, error: `Update failed: ${updErr.message}` };

  revalidatePath("/settings");
  revalidatePath("/review-queue");

  return { ok: true, message: "Review settings saved." };
}
