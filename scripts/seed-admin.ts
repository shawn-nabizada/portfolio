// scripts/seed-admin.ts
// Usage: npx tsx scripts/seed-admin.ts
//
// Creates the admin user via Supabase Auth API and inserts a corresponding
// profile row. Reads configuration from environment variables or .env.local.
//
// Required env vars:
//   NEXT_PUBLIC_SUPABASE_URL   — Supabase project URL
//   SUPABASE_SERVICE_ROLE_KEY  — Service role key (NOT the anon key)
//   ADMIN_EMAIL                — Email for the admin account
//   ADMIN_PASSWORD             — Password for the admin account
//
// Optional env vars:
//   ADMIN_FULL_NAME            — Display name (defaults to "Admin")

import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;
  const adminFullName = process.env.ADMIN_FULL_NAME || "Admin";

  // ── Validate required env vars ──────────────────────────────────
  const missing: string[] = [];
  if (!supabaseUrl) missing.push("NEXT_PUBLIC_SUPABASE_URL");
  if (!serviceRoleKey) missing.push("SUPABASE_SERVICE_ROLE_KEY");
  if (!adminEmail) missing.push("ADMIN_EMAIL");
  if (!adminPassword) missing.push("ADMIN_PASSWORD");

  if (missing.length > 0) {
    console.error(
      `Missing required environment variables:\n  ${missing.join("\n  ")}\n`
    );
    console.error(
      "Create a .env.local file or export them before running this script."
    );
    process.exit(1);
  }

  // ── Create Supabase admin client (service role bypasses RLS) ────
  const supabase = createClient(supabaseUrl!, serviceRoleKey!, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  // ── Create the auth user ────────────────────────────────────────
  console.log(`Creating admin user: ${adminEmail}`);

  const { data: authData, error: authError } =
    await supabase.auth.admin.createUser({
      email: adminEmail!,
      password: adminPassword!,
      email_confirm: true,
    });

  if (authError) {
    // If the user already exists, that's OK — just log and continue
    if (authError.message?.includes("already been registered")) {
      console.log("Admin user already exists. Skipping auth creation.");

      // Look up the existing user to get their ID for the profile upsert
      const { data: listData, error: listError } =
        await supabase.auth.admin.listUsers();

      if (listError) {
        console.error("Failed to list users:", listError.message);
        process.exit(1);
      }

      const existingUser = listData.users.find(
        (u) => u.email === adminEmail
      );

      if (!existingUser) {
        console.error(
          "User reportedly exists but could not be found. Aborting."
        );
        process.exit(1);
      }

      // Upsert profile for the existing user
      await upsertProfile(supabase, existingUser.id, adminFullName);
      return;
    }

    console.error("Failed to create admin user:", authError.message);
    process.exit(1);
  }

  console.log(`Admin user created with ID: ${authData.user.id}`);

  // ── Insert the profile row ──────────────────────────────────────
  await upsertProfile(supabase, authData.user.id, adminFullName);
}

async function upsertProfile(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  fullName: string
) {
  console.log("Upserting admin profile...");

  const { error: profileError } = await supabase.from("profiles").upsert(
    {
      id: userId,
      full_name: fullName,
      headline_en: "Full-Stack Developer",
      headline_fr: "Developpeur Full-Stack",
      bio_en:
        "Passionate full-stack developer specializing in modern web technologies.",
      bio_fr:
        "Developpeur full-stack passionne, specialise dans les technologies web modernes.",
      location: "Montreal, QC",
    },
    { onConflict: "id" }
  );

  if (profileError) {
    console.error("Failed to upsert profile:", profileError.message);
    process.exit(1);
  }

  console.log("Admin profile upserted successfully.");
  console.log("\nDone! You can now sign in with the admin credentials.");
}

main().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});
