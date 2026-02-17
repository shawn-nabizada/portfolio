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

const SKILL_SORT_FIELDS = ["order", "name_en", "name_fr", "created_at"] as const;

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const searchParams = request.nextUrl.searchParams;
  const pagination = readPaginationParams(searchParams);
  const queryText = parseSearchQuery(searchParams.get("q"));
  const sortBy = parseSortBy(searchParams.get("sortBy"), SKILL_SORT_FIELDS, "order");
  const sortDir = parseSortDir(searchParams.get("sortDir"), "asc");
  const translation = parseTranslationFilter(searchParams.get("translation"));

  let query = supabase
    .from("skills")
    .select(
      "*, category:skill_categories(*)",
      pagination.enabled ? { count: "exact" } : undefined
    )
    .order(sortBy, { ascending: sortDir === "asc" });

  if (queryText) {
    const pattern = toOrIlikePattern(queryText);
    query = query.or(
      [
        `name_en.ilike.${pattern}`,
        `name_fr.ilike.${pattern}`,
      ].join(",")
    );
  }

  query = applyTranslationFilter(query, translation, "name_en", "name_fr");

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
  const { name_en, name_fr, category_id, order } = body;
  const parsedOrder = Number.isFinite(Number(order)) ? Number(order) : 0;

  if (!name_en || !name_fr) {
    return apiError("name_en and name_fr are required", 400);
  }

  const adminClient = createAdminClient();

  const { data, error } = await adminClient
    .from("skills")
    .insert({
      name_en,
      name_fr,
      category_id: category_id || null,
      order: parsedOrder,
    })
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
  return apiSuccess(data, 201);
}
