"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type AcceptInviteState = { error?: string } | undefined;

const schema = z.object({
  token: z.string().min(1),
  name: z.string().min(1).max(120),
  password: z.string().min(8),
});

/**
 * Honor an invite token and create the new teammate's auth user + public.users
 * row tied to the invitation's client_id and role. Marks the invite accepted
 * and signs the new user in, then redirects to /dashboard.
 */
export async function acceptInvite(
  _prev: AcceptInviteState,
  formData: FormData,
): Promise<AcceptInviteState> {
  const parsed = schema.safeParse({
    token: formData.get("token"),
    name: formData.get("name"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { token, name, password } = parsed.data;

  const admin = createAdminClient();

  const { data: invite } = await admin
    .from("invitations")
    .select("id, client_id, email, role, team_name, expires_at, accepted_at")
    .eq("token", token)
    .maybeSingle();

  if (!invite) return { error: "Invite not found." };
  if (invite.accepted_at) return { error: "This invite has already been used." };
  if (new Date(invite.expires_at).getTime() <= Date.now()) {
    return { error: "This invite has expired." };
  }

  // Create the auth user. We auto-confirm the email since they came from a
  // trusted invite link.
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email: invite.email,
    password,
    email_confirm: true,
    user_metadata: {
      name,
      invited: true,
    },
  });
  if (createErr || !created.user) {
    // If the user already exists in auth, surface a friendlier message.
    if (createErr?.message?.toLowerCase().includes("already")) {
      return {
        error:
          "An account with this email already exists. Sign in instead, then ask your admin to add you to the workspace.",
      };
    }
    return { error: `Could not create account: ${createErr?.message}` };
  }

  // Link the auth user to the workspace via public.users.
  const { error: profileErr } = await admin.from("users").insert({
    id: created.user.id,
    client_id: invite.client_id,
    name,
    email: invite.email,
    role: invite.role,
    team_name: invite.team_name,
  });
  if (profileErr) {
    // Try to roll back the auth user so a re-attempt isn't blocked by
    // "email already exists".
    await admin.auth.admin.deleteUser(created.user.id);
    return { error: `Could not link account: ${profileErr.message}` };
  }

  // Mark the invite consumed.
  await admin
    .from("invitations")
    .update({ accepted_at: new Date().toISOString() })
    .eq("id", invite.id);

  // Sign the new user in so they land directly on /dashboard.
  const supabase = await createClient();
  const { error: signErr } = await supabase.auth.signInWithPassword({
    email: invite.email,
    password,
  });
  if (signErr) {
    // Account exists, just couldn't sign in. Redirect to /login so they can.
    redirect("/login");
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}
