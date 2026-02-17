import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminUser } from "@/lib/auth/admin";
import { apiError, apiSuccess } from "@/lib/http/api";
import { revalidatePortfolioPages } from "@/lib/revalidation";
import { getNextOrderValue } from "@/lib/admin/duplicate";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminCheck = await requireAdminUser();
  if (!adminCheck.ok) {
    return adminCheck.response;
  }

  const { id } = await params;
  const adminClient = createAdminClient();

  const { data: source, error: sourceError } = await adminClient
    .from("social_links")
    .select("platform,url,icon")
    .eq("id", id)
    .maybeSingle();

  if (sourceError) {
    return apiError(sourceError.message);
  }

  if (!source) {
    return apiError("social link not found", 404);
  }

  const nextOrder = await getNextOrderValue(adminClient, "social_links");

  const { data: created, error: insertError } = await adminClient
    .from("social_links")
    .insert({
      ...source,
      order: nextOrder,
    })
    .select()
    .single();

  if (insertError) {
    return apiError(insertError.message);
  }

  revalidatePortfolioPages();
  return apiSuccess(created, 201);
}
