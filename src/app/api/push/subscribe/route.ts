import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/push/subscribe
 *
 * Stores a Web Push subscription object for the currently authenticated user.
 * The subscription JSON comes from the browser's PushManager.subscribe() call.
 *
 * Body: { subscription: PushSubscription, userAgent?: string }
 */
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
      .select("client_id")
      .eq("id", user.id)
      .single();

    if (!appUser?.client_id) {
      return NextResponse.json({ error: "User not in a workspace" }, { status: 403 });
    }

    const body = await req.json();
    const { subscription, userAgent } = body as {
      subscription: Record<string, unknown>;
      userAgent?: string;
    };

    if (!subscription?.endpoint) {
      return NextResponse.json({ error: "Invalid subscription object" }, { status: 400 });
    }

    // Upsert — if this endpoint already exists for this user, update it
    const { error } = await supabase.from("push_subscriptions").upsert(
      {
        user_id: user.id,
        client_id: appUser.client_id,
        subscription,
        user_agent: userAgent ?? null,
        updated_at: new Date().toISOString(),
      },
      // We don't have a unique constraint on endpoint, so we just insert fresh
    );

    if (error) {
      console.error("[push/subscribe] DB error:", error);
      return NextResponse.json({ error: "Failed to save subscription" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[push/subscribe] Error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

/**
 * DELETE /api/push/subscribe
 *
 * Removes all push subscriptions for the currently authenticated user
 * (opts them out of push notifications entirely).
 */
export async function DELETE() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await supabase.from("push_subscriptions").delete().eq("user_id", user.id);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[push/subscribe] DELETE error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
