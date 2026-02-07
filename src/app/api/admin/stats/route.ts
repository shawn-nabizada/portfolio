import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  // Auth check: verify user is logged in
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Use admin client to bypass RLS for protected tables
  const adminClient = createAdminClient();

  const [skillsResult, projectsResult, messagesResult, testimonialsResult] =
    await Promise.all([
      adminClient.from("skills").select("id", { count: "exact", head: true }),
      adminClient.from("projects").select("id", { count: "exact", head: true }),
      adminClient
        .from("contact_messages")
        .select("id", { count: "exact", head: true })
        .eq("read", false),
      adminClient
        .from("testimonials")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending"),
    ]);

  return NextResponse.json({
    totalSkills: skillsResult.count ?? 0,
    totalProjects: projectsResult.count ?? 0,
    unreadMessages: messagesResult.count ?? 0,
    pendingTestimonials: testimonialsResult.count ?? 0,
  });
}
