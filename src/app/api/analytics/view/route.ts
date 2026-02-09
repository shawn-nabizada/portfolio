import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { apiError, apiSuccess } from "@/lib/http/api";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const locale = body.locale === "fr" ? "fr" : "en";
  const path = typeof body.path === "string" ? body.path : null;

  const adminClient = createAdminClient();
  const { error } = await adminClient.from("analytics_events").insert({
    event_type: "portfolio_view",
    locale,
    path,
    metadata: {
      ip: request.headers.get("x-forwarded-for") || null,
      userAgent: request.headers.get("user-agent") || null,
    },
  });

  if (error) {
    return apiError(error.message);
  }

  return apiSuccess({ success: true }, 201);
}
