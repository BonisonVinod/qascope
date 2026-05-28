import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment");
  process.exit(1);
}

console.log(`📡 Connecting to Supabase URL: ${supabaseUrl}`);

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  }
});

async function runDiagnostics() {
  try {
    // 1. Check public.users table structure and contents
    console.log("\n📊 Querying public.users table...");
    const { data: users, error: usersError } = await supabase
      .from("users")
      .select("*");

    if (usersError) {
      console.error("❌ Error querying public.users table:", usersError);
    } else {
      console.log(`✅ Successfully queried public.users. Found ${users?.length || 0} user(s):`);
      console.log(JSON.stringify(users, null, 2));
    }

    // 2. Check auth.users table
    console.log("\n🔑 Querying auth.users via admin API...");
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      console.error("❌ Error listing auth users:", authError);
    } else {
      console.log(`✅ Successfully listed auth users. Found ${authUsers?.users?.length || 0} user(s):`);
      console.log(JSON.stringify(authUsers?.users?.map(u => ({
        id: u.id,
        email: u.email,
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at
      })), null, 2));
    }

    // 3. Check public.clients table
    console.log("\n🏢 Querying public.clients table...");
    const { data: clients, error: clientsError } = await supabase
      .from("clients")
      .select("id, name, active_plan");

    if (clientsError) {
      console.error("❌ Error querying public.clients:", clientsError);
    } else {
      console.log(`✅ Successfully queried public.clients. Found ${clients?.length || 0} client(s):`);
      console.log(JSON.stringify(clients, null, 2));
    }

  } catch (err) {
    console.error("❌ Diagnostic run failed with exception:", err);
  }
}

runDiagnostics();
