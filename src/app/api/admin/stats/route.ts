import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminUser } from "@/lib/auth/admin";
import { apiError, apiSuccess } from "@/lib/http/api";

function describeSupabaseError(error: unknown): string {
  if (!error) {
    return "Unknown Supabase error";
  }

  if (typeof error === "string") {
    return error;
  }

  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "object") {
    const record = error as Record<string, unknown>;
    const messageParts: string[] = [];

    if (typeof record.code === "string" && record.code.length > 0) {
      messageParts.push(`[${record.code}]`);
    }
    if (typeof record.message === "string" && record.message.length > 0) {
      messageParts.push(record.message);
    }
    if (typeof record.details === "string" && record.details.length > 0) {
      messageParts.push(record.details);
    }
    if (typeof record.hint === "string" && record.hint.length > 0) {
      messageParts.push(`hint: ${record.hint}`);
    }
    if (typeof record.error_description === "string" && record.error_description.length > 0) {
      messageParts.push(record.error_description);
    }

    if (messageParts.length > 0) {
      return messageParts.join(" ");
    }

    try {
      return JSON.stringify(record);
    } catch {
      return "Unknown Supabase error object";
    }
  }

  return String(error);
}

export async function GET() {
  const adminCheck = await requireAdminUser();
  if (!adminCheck.ok) {
    return adminCheck.response;
  }

  try {
    const hasSupabaseUrl = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);
    const hasServiceRoleKey = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
    if (!hasSupabaseUrl || !hasServiceRoleKey) {
      return apiError(
        "Failed to load dashboard stats: missing server env NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY"
      );
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

    const statsResults = [
      { key: "skills", result: skillsResult },
      { key: "projects", result: projectsResult },
      { key: "contact_messages.unread", result: messagesResult },
      { key: "testimonials.pending", result: testimonialsResult },
      { key: "analytics_events.portfolio_view", result: viewsResult },
      { key: "analytics_events.resume_download", result: downloadsResult },
    ];

    const failedQueries = statsResults
      .filter((entry) => Boolean(entry.result.error))
      .map((entry) => {
        const error = entry.result.error;
        const statusPart =
          typeof entry.result.status === "number" ? ` (status ${entry.result.status})` : "";
        return `${entry.key}${statusPart}: ${describeSupabaseError(error)}`;
      });

    if (failedQueries.length > 0) {
      const detailMessage = failedQueries.join("; ");
      console.error("[api/admin/stats] Failed query", detailMessage);
      return apiError(`Failed to load dashboard stats: ${detailMessage}`);
    }

    return apiSuccess({
      totalSkills: skillsResult.count ?? 0,
      totalProjects: projectsResult.count ?? 0,
      unreadMessages: messagesResult.count ?? 0,
      pendingTestimonials: testimonialsResult.count ?? 0,
      portfolioViews: viewsResult.count ?? 0,
      resumeDownloads: downloadsResult.count ?? 0,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown server error";
    console.error("[api/admin/stats] Unexpected error", error);
    return apiError(`Failed to load dashboard stats: ${message}`);
  }
}
