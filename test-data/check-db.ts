import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Supabase environment variables are missing!");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function main() {
  console.log("Connecting to Supabase at:", supabaseUrl);
  
  const { data: users, error } = await supabase
    .from("users")
    .select("id, email, name, role, is_super_admin, created_at")
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error fetching users:", error);
    process.exit(1);
  }

  console.log("\n--- Users in Database ---");
  if (!users || users.length === 0) {
    console.log("No users found in database!");
  } else {
    users.forEach((u, i) => {
      console.log(`[User ${i + 1}] ID: ${u.id}`);
      console.log(`  Name: ${u.name}`);
      console.log(`  Email: ${u.email}`);
      console.log(`  Role: ${u.role}`);
      console.log(`  Super Admin: ${u.is_super_admin}`);
      console.log(`  Created At: ${u.created_at}`);
      console.log("-----------------------");
    });
  }
}

main().catch(console.error);
