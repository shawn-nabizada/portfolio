import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminUser } from "@/lib/auth/admin";
import { apiError, apiSuccess } from "@/lib/http/api";
import { parseBulkRequest } from "@/lib/admin/bulk";
import { revalidatePortfolioPages } from "@/lib/revalidation";

const ACTIONS = ["approve", "reject", "delete"] as const;

type TestimonialBulkAction = (typeof ACTIONS)[number];

function isTestimonialBulkAction(value: string): value is TestimonialBulkAction {
  return ACTIONS.includes(value as TestimonialBulkAction);
}

export async function POST(request: NextRequest) {
  const adminCheck = await requireAdminUser();
  if (!adminCheck.ok) {
    return adminCheck.response;
  }

  const parsed = await parseBulkRequest(request);
  if ("error" in parsed) {
    return apiError(parsed.error, parsed.status);
  }

  if (!isTestimonialBulkAction(parsed.action)) {
    return apiError("unsupported bulk action", 400);
  }

  const adminClient = createAdminClient();

  if (parsed.action === "delete") {
    const { data, error } = await adminClient
      .from("testimonials")
      .delete()
      .in("id", parsed.ids)
      .select("id");

    if (error) {
      return apiError(error.message);
    }

    revalidatePortfolioPages();
    return apiSuccess({ success: true, affected: data?.length ?? 0 });
  }

  const status = parsed.action === "approve" ? "approved" : "rejected";
  const { data, error } = await adminClient
    .from("testimonials")
    .update({ status })
    .in("id", parsed.ids)
    .select("id");

  if (error) {
    return apiError(error.message);
  }

  revalidatePortfolioPages();
  return apiSuccess({ success: true, affected: data?.length ?? 0 });
}
