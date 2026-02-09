import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminUser } from "@/lib/auth/admin";
import { apiError, apiSuccess } from "@/lib/http/api";
import { revalidatePortfolioPages } from "@/lib/revalidation";

function normalizeMonthDate(value: string | null | undefined): string | null {
  if (!value) return null;
  return /^\d{4}-\d{2}$/.test(value) ? `${value}-01` : value;
}

export async function GET() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("education")
    .select("*")
    .order("order");

  if (error) {
    return apiError(error.message);
  }

  return apiSuccess(data ?? []);
}

export async function POST(request: NextRequest) {
  const adminCheck = await requireAdminUser();
  if (!adminCheck.ok) {
    return adminCheck.response;
  }

  const body = await request.json();
  const {
    institution,
    degree_en,
    degree_fr,
    field_en,
    field_fr,
    location,
    start_date,
    end_date,
    order,
  } = body;

  if (!institution || !degree_en || !degree_fr || !field_en || !field_fr || !start_date) {
    return apiError(
      "institution, degree_en, degree_fr, field_en, field_fr, and start_date are required",
      400
    );
  }

  const adminClient = createAdminClient();

  const { data, error } = await adminClient
    .from("education")
    .insert({
      institution,
      degree_en,
      degree_fr,
      field_en,
      field_fr,
      location: location || null,
      start_date: normalizeMonthDate(start_date),
      end_date: normalizeMonthDate(end_date),
      order: order ?? 0,
    })
    .select()
    .single();

  if (error) {
    return apiError(error.message);
  }

  revalidatePortfolioPages();
  return apiSuccess(data, 201);
}
