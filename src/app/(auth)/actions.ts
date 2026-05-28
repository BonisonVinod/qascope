"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { headers } from "next/headers";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().min(1, "Name is required"),
  clientName: z.string().min(1, "Company name is required"),
  agreeToTerms: z.literal("on", {
    message: "You must agree to the Terms and Privacy Policy.",
  }),
});

export type ActionState = { error?: string; ok?: boolean } | undefined;

export async function login(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: "Invalid email or password" };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    return { error: error.message };
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function signup(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = signupSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    name: formData.get("name"),
    clientName: formData.get("clientName"),
    agreeToTerms: formData.get("agreeToTerms"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const supabase = await createClient();
  const admin = createAdminClient();

  // 1. Create auth user. Stash name + clientName in user metadata so we
  //    can read it here after signup.
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: {
        name: parsed.data.name,
        client_name: parsed.data.clientName,
      },
    },
  });

  if (authError) return { error: authError.message };
  if (!authData.user) return { error: "Signup failed — no user returned" };

  // 2. Use the admin (service-role) client to create the client + users rows.
  //    This bypasses RLS since the new user isn't yet linked to a client.
  const { data: clientRow, error: clientError } = await admin
    .from("clients")
    .insert({
      name: parsed.data.clientName,
      active_plan: "pilot",
    })
    .select()
    .single();

  if (clientError || !clientRow) {
    return { error: `Could not create organization: ${clientError?.message}` };
  }

  const { error: userError } = await admin.from("users").insert({
    id: authData.user.id,
    client_id: clientRow.id,
    name: parsed.data.name,
    email: parsed.data.email,
    role: "admin", // first user of a new client is the admin
    agreed_to_terms_at: new Date().toISOString(),
    terms_version_agreed: 1,
  });

  if (userError) {
    return { error: `Could not create user profile: ${userError.message}` };
  }

  // 3. Seed the default QA rubric for this new client
  const { error: rubricError } = await admin.rpc("seed_default_rubric", {
    p_client_id: clientRow.id,
  });
  if (rubricError) {
    // Non-fatal — they can seed manually later. Log but continue.
    console.error("Rubric seed failed:", rubricError);
  }

  revalidatePath("/", "layout");

  // If email confirmation is enabled in Supabase, session will be null here —
  // user needs to check email. Otherwise we're logged in and can redirect.
  if (authData.session) {
    redirect("/dashboard");
  }
  redirect("/login?confirm=1");
}

export async function signout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}

const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export async function forgotPassword(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = forgotPasswordSchema.safeParse({
    email: formData.get("email"),
  });
  if (!parsed.success) {
    return { error: "Invalid email address" };
  }

  const supabase = await createClient();
  const headersList = await headers();
  const host = headersList.get("host") || "localhost:3000";
  const protocol = host.includes("localhost") ? "http" : "https";
  const origin = `${protocol}://${host}`;

  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${origin}/auth/callback?next=/reset-password`,
  });

  if (error) {
    return { error: error.message };
  }

  return { ok: true };
}

const updatePasswordSchema = z.object({
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string().min(8, "Password must be at least 8 characters"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

export async function updatePassword(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = updatePasswordSchema.safeParse({
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/", "layout");
  redirect("/dashboard?password_updated=1");
}
