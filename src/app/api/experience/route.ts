import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminUser } from "@/lib/auth/admin";
import { apiError, apiSuccess } from "@/lib/http/api";
import { createPaginatedResponse, readPaginationParams } from "@/lib/pagination";
import { revalidatePortfolioPages } from "@/lib/revalidation";

function normalizeMonthDate(value: string | null | undefined): string | null {
  if (!value) return null;
  return /^\d{4}-\d{2}$/.test(value) ? `${value}-01` : value;
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const pagination = readPaginationParams(request.nextUrl.searchParams);

  let query = supabase
    .from("experience")
    .select("*", pagination.enabled ? { count: "exact" } : undefined)
    .order("order");
  if (pagination.enabled) {
    query = query.range(pagination.from, pagination.to);
  }

  const { data, error, count } = await query;

  if (error) {
    return apiError(error.message);
  }

  if (pagination.enabled) {
    return apiSuccess(
      createPaginatedResponse(
        data ?? [],
        pagination.page,
        pagination.pageSize,
        count ?? 0
      )
    );
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

  if (!company || !position_en || !position_fr || !start_date) {
    return apiError(
      "company, position_en, position_fr, and start_date are required",
      400
    );
  }

  const adminClient = createAdminClient();

  const { data, error } = await adminClient
    .from("experience")
    .insert({
      company,
      position_en,
      position_fr,
      description_en: description_en || null,
      description_fr: description_fr || null,
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
