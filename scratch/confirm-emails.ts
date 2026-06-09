import { createClient } from "@supabase/supabase-js";

async function confirmAllUsers() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error("Missing Supabase configuration env variables.");
    process.exit(1);
  }

  // Create high-privilege service role client to access admin auth APIs
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  console.log("Fetching registered users from Supabase Auth...");
  const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();

  if (listError) {
    console.error("Failed to list users:", listError.message);
    process.exit(1);
  }

  console.log(`Found ${users.length} users in database.`);

  for (const user of users) {
    if (!user.email_confirmed_at) {
      console.log(`Confirming email for user: ${user.email} (${user.id})...`);
      const { error: updateError } = await supabase.auth.admin.updateUserById(
        user.id,
        { email_confirm: true }
      );

      if (updateError) {
        console.error(`Failed to confirm ${user.email}:`, updateError.message);
      } else {
        console.log(`Successfully confirmed ${user.email}!`);
      }
    } else {
      console.log(`User ${user.email} is already confirmed.`);
    }
  }

  console.log("All user accounts confirmed successfully.");
}

confirmAllUsers().catch((err) => {
  console.error("Execution crashed:", err);
  process.exit(1);
});
