import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminUser } from "@/lib/auth/admin";
import { apiError, apiSuccess } from "@/lib/http/api";
import { createPaginatedResponse, readPaginationParams } from "@/lib/pagination";
import { revalidatePortfolioPages } from "@/lib/revalidation";
import {
  getSocialPreset,
  isSocialPresetKey,
  normalizeSocialUrl,
} from "@/lib/social-presets";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const pagination = readPaginationParams(request.nextUrl.searchParams);

  let query = supabase
    .from("social_links")
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
  const order = Number.isFinite(Number(body.order)) ? Number(body.order) : 0;
  const presetKey = body.preset;
  const normalizedUrl = normalizeSocialUrl(body.url);

  if (!isSocialPresetKey(presetKey)) {
    return apiError("valid preset is required", 400);
  }

  if (!normalizedUrl) {
    return apiError("valid url is required", 400);
  }

  const preset = getSocialPreset(presetKey);
  if (!preset) {
    return apiError("valid preset is required", 400);
  }

  const adminClient = createAdminClient();
  const { data, error } = await adminClient
    .from("social_links")
    .insert({
      platform: preset.label,
      url: normalizedUrl,
      icon: preset.key,
      order,
    })
    .select()
    .single();

  if (error) {
    return apiError(error.message);
  }

  revalidatePortfolioPages();
  return apiSuccess(data, 201);
}
