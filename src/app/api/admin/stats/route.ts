import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminUser } from "@/lib/auth/admin";
import { apiError, apiSuccess } from "@/lib/http/api";

export async function GET() {
  const adminCheck = await requireAdminUser();
  if (!adminCheck.ok) {
    return adminCheck.response;
  }

  const adminClient = createAdminClient();

  const [
    skillsResult,
    projectsResult,
    messagesResult,
    testimonialsResult,
    viewsResult,
    downloadsResult,
  ] = await Promise.all([
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
    adminClient
      .from("analytics_events")
      .select("id", { count: "exact", head: true })
      .eq("event_type", "portfolio_view"),
    adminClient
      .from("analytics_events")
      .select("id", { count: "exact", head: true })
      .eq("event_type", "resume_download"),
  ]);

  if (
    skillsResult.error ||
    projectsResult.error ||
    messagesResult.error ||
    testimonialsResult.error ||
    viewsResult.error ||
    downloadsResult.error
  ) {
    return apiError("Failed to load dashboard stats");
  }

  return apiSuccess({
    totalSkills: skillsResult.count ?? 0,
    totalProjects: projectsResult.count ?? 0,
    unreadMessages: messagesResult.count ?? 0,
    pendingTestimonials: testimonialsResult.count ?? 0,
    portfolioViews: viewsResult.count ?? 0,
    resumeDownloads: downloadsResult.count ?? 0,
  });
}
