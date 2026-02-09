import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminUser } from "@/lib/auth/admin";
import { apiError, apiSuccess } from "@/lib/http/api";
import { revalidatePortfolioPages } from "@/lib/revalidation";

function normalizeMonthDate(value: string | null | undefined): string | null {
  if (!value) return null;
  return /^\d{4}-\d{2}$/.test(value) ? `${value}-01` : value;
}

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
  const {
    company,
    position_en,
    position_fr,
    description_en,
    description_fr,
    location,
    start_date,
    end_date,
    order,
  } = body;

  const adminClient = createAdminClient();

  const { data, error } = await adminClient
    .from("experience")
    .update({
      ...(company !== undefined && { company }),
      ...(position_en !== undefined && { position_en }),
      ...(position_fr !== undefined && { position_fr }),
      ...(description_en !== undefined && { description_en: description_en || null }),
      ...(description_fr !== undefined && { description_fr: description_fr || null }),
      ...(location !== undefined && { location: location || null }),
      ...(start_date !== undefined && { start_date: normalizeMonthDate(start_date) }),
      ...(end_date !== undefined && { end_date: normalizeMonthDate(end_date) }),
      ...(order !== undefined && { order }),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
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

  const { error } = await adminClient.from("experience").delete().eq("id", id);

  if (error) {
    return apiError(error.message);
  }

  revalidatePortfolioPages();
  return apiSuccess({ success: true });
}
