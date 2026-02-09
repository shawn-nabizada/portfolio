import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminUser } from "@/lib/auth/admin";
import { apiError, apiSuccess } from "@/lib/http/api";
import { revalidatePortfolioPages } from "@/lib/revalidation";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminCheck = await requireAdminUser();
  if (!adminCheck.ok) {
    return adminCheck.response;
  }

  const { id } = await params;
  const body = await request.json();
  const { name_en, name_fr, category_id, order } = body;
  const parsedOrder =
    order !== undefined ? (Number.isFinite(Number(order)) ? Number(order) : 0) : undefined;

  const adminClient = createAdminClient();

  const { data, error } = await adminClient
    .from("skills")
    .update({
      ...(name_en !== undefined && { name_en }),
      ...(name_fr !== undefined && { name_fr }),
      ...(category_id !== undefined && { category_id: category_id || null }),
      ...(parsedOrder !== undefined && { order: parsedOrder }),
    })
    .eq("id", id)
    .select("*, category:skill_categories(*)")
    .single();

  if (error) {
    if (
      error.code === "23505" &&
      (error.message.includes("skills_order_unique") || error.message.includes("(order)"))
    ) {
      return apiError("Another skill already uses this order value.", 400);
    }
    return apiError(error.message);
  }

  revalidatePortfolioPages();
  return apiSuccess(data);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminCheck = await requireAdminUser();
  if (!adminCheck.ok) {
    return adminCheck.response;
  }

  const { id } = await params;
  const adminClient = createAdminClient();

  const { error } = await adminClient.from("skills").delete().eq("id", id);

  if (error) {
    return apiError(error.message);
  }

  revalidatePortfolioPages();
  return apiSuccess({ success: true });
}
