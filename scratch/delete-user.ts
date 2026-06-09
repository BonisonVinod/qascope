import { createClient } from "@supabase/supabase-js";

async function deleteUser() {
  const email = process.argv[2];

  if (!email) {
    console.error("Error: Please specify the email to delete.");
    console.log("Usage: node --experimental-strip-types --env-file-if-exists=.env.local scratch/delete-user.ts <email>");
    process.exit(1);
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error("Missing Supabase configuration env variables.");
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  console.log(`Searching for user with email: ${email}...`);
  const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();

  if (listError) {
    console.error("Failed to fetch users:", listError.message);
    process.exit(1);
  }

  const targetUser = users.find((u) => u.email?.toLowerCase() === email.toLowerCase());

  if (!targetUser) {
    console.log(`User with email '${email}' does not exist in Supabase Auth.`);
    process.exit(0);
  }

  console.log(`Found user: ${targetUser.email} (ID: ${targetUser.id}). purging...`);
  
  // 1. Delete from custom users table (best effort to ensure clean cascade)
  const { error: dbDeleteError } = await supabase
    .from("users")
    .delete()
    .eq("id", targetUser.id);
    
  if (dbDeleteError) {
    console.warn("Notice (non-blocking): custom public.users delete check:", dbDeleteError.message);
  }

  // 2. Delete from Supabase Auth directory
  const { error: authDeleteError } = await supabase.auth.admin.deleteUser(targetUser.id);

  if (authDeleteError) {
    console.error("Failed to delete user from Supabase Auth:", authDeleteError.message);
    process.exit(1);
  }

  console.log(`Successfully purged ${email} completely from Supabase Auth and database tables!`);
}

deleteUser().catch((err) => {
  console.error("Execution failed:", err);
  process.exit(1);
});
