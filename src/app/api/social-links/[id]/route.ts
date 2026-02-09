import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminUser } from "@/lib/auth/admin";
import { apiError, apiSuccess } from "@/lib/http/api";
import { revalidatePortfolioPages } from "@/lib/revalidation";
import {
  getSocialPreset,
  isSocialPresetKey,
  normalizeSocialUrl,
} from "@/lib/social-presets";

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
  const updates: Record<string, unknown> = {};

  if (body.preset !== undefined) {
    if (!isSocialPresetKey(body.preset)) {
      return apiError("valid preset is required", 400);
    }

    const preset = getSocialPreset(body.preset);
    if (!preset) {
      return apiError("valid preset is required", 400);
    }

    updates.platform = preset.label;
    updates.icon = preset.key;
  }

  if (body.url !== undefined) {
    const normalizedUrl = normalizeSocialUrl(body.url);
    if (!normalizedUrl) {
      return apiError("valid url is required", 400);
    }
    updates.url = normalizedUrl;
  }

  if (body.order !== undefined) {
    updates.order = Number.isFinite(Number(body.order)) ? Number(body.order) : 0;
  }

  if (Object.keys(updates).length === 0) {
    return apiError("no valid fields provided", 400);
  }

  const adminClient = createAdminClient();
  const { data, error } = await adminClient
    .from("social_links")
    .update(updates)
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
  const { error } = await adminClient.from("social_links").delete().eq("id", id);

  if (error) {
    return apiError(error.message);
  }

  revalidatePortfolioPages();
  return apiSuccess({ success: true });
}
