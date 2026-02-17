import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminUser } from "@/lib/auth/admin";
import { apiError, apiSuccess } from "@/lib/http/api";
import { createPaginatedResponse, readPaginationParams } from "@/lib/pagination";
import { revalidatePortfolioPages } from "@/lib/revalidation";
import {
  applyTranslationFilter,
  parseSearchQuery,
  parseSortBy,
  parseSortDir,
  parseTranslationFilter,
  toOrIlikePattern,
} from "@/lib/admin/list-query";

const EDUCATION_SORT_FIELDS = ["order", "institution", "start_date", "end_date", "created_at"] as const;

function normalizeMonthDate(value: string | null | undefined): string | null {
  if (!value) return null;
  return /^\d{4}-\d{2}$/.test(value) ? `${value}-01` : value;
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const searchParams = request.nextUrl.searchParams;
  const pagination = readPaginationParams(searchParams);
  const queryText = parseSearchQuery(searchParams.get("q"));
  const sortBy = parseSortBy(searchParams.get("sortBy"), EDUCATION_SORT_FIELDS, "order");
  const sortDir = parseSortDir(searchParams.get("sortDir"), "asc");
  const translation = parseTranslationFilter(searchParams.get("translation"));

  let query = supabase
    .from("education")
    .select("*", pagination.enabled ? { count: "exact" } : undefined)
    .order(sortBy, { ascending: sortDir === "asc" });

  if (queryText) {
    const pattern = toOrIlikePattern(queryText);
    query = query.or(
      [
        `institution.ilike.${pattern}`,
        `degree_en.ilike.${pattern}`,
        `degree_fr.ilike.${pattern}`,
        `location.ilike.${pattern}`,
      ].join(",")
    );
  }

  query = applyTranslationFilter(query, translation, "degree_en", "degree_fr");

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
    institution,
    degree_en,
    degree_fr,
    location,
    start_date,
    end_date,
    order,
  } = body;

  if (!institution || !degree_en || !degree_fr || !start_date) {
    return apiError(
      "institution, degree_en, degree_fr, and start_date are required",
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
