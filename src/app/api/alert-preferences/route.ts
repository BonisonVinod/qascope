import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: appUser } = await supabase
      .from("users")
      .select("role, client_id")
      .eq("id", user.id)
      .single();

    if (!appUser?.client_id || !["admin", "qa_manager"].includes(appUser.role ?? "")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { email_on_critical_fail, email_on_low_score, alert_score_threshold } = body;

    const { error } = await supabase.from("alert_preferences").upsert(
      {
        client_id: appUser.client_id,
        email_on_critical_fail,
        email_on_low_score,
        alert_score_threshold,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "client_id" },
    );

    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[alert-preferences] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
