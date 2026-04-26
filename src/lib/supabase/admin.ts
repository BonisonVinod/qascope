// Admin Supabase client — bypasses RLS, uses the service role key.
// ONLY use from server-side code (Server Actions, Route Handlers, server utilities).
// NEVER import this in Client Components.
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../database.types";

export function createAdminClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
