import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminUser } from "@/lib/auth/admin";
import { apiError, apiSuccess } from "@/lib/http/api";
import { parseBulkRequest } from "@/lib/admin/bulk";
import { revalidatePortfolioPages } from "@/lib/revalidation";

export async function POST(request: NextRequest) {
  const adminCheck = await requireAdminUser();
  if (!adminCheck.ok) {
    return adminCheck.response;
  }

  const parsed = await parseBulkRequest(request);
  if ("error" in parsed) {
    return apiError(parsed.error, parsed.status);
  }

  if (parsed.action !== "delete") {
    return apiError("unsupported bulk action", 400);
  }

  const adminClient = createAdminClient();
  const { data, error } = await adminClient
    .from("experience")
    .delete()
    .in("id", parsed.ids)
    .select("id");

  if (error) {
    return apiError(error.message);
  }

  revalidatePortfolioPages();
  return apiSuccess({ success: true, affected: data?.length ?? 0 });
}
