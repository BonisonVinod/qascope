import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { LandingClient } from "@/app/landing-client";

export const dynamic = "force-dynamic";

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // If already authenticated, bypass landing page and go to dashboard
  if (user) {
    redirect("/dashboard");
  }

  return <LandingClient />;
}
