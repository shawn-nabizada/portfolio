import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminUser } from "@/lib/auth/admin";
import { apiError, apiSuccess } from "@/lib/http/api";
import { revalidatePortfolioPages } from "@/lib/revalidation";
import { SHARED_PROFILE_ID } from "@/lib/constants/profile";

export async function GET() {
  const adminCheck = await requireAdminUser();
  if (!adminCheck.ok) {
    return adminCheck.response;
  }

  const adminClient = createAdminClient();
  const { data, error } = await adminClient
    .from("profiles")
    .select("*")
    .eq("id", SHARED_PROFILE_ID)
    .maybeSingle();

  if (error) {
    return apiError(error.message);
  }

  return apiSuccess(data);
}

export async function PUT(request: NextRequest) {
  const adminCheck = await requireAdminUser();
  if (!adminCheck.ok) {
    return adminCheck.response;
  }

  const body = await request.json();
  const {
    full_name,
    headline_en,
    headline_fr,
    bio_en,
    bio_fr,
    location,
    avatar_url,
  } = body;

  const adminClient = createAdminClient();
  const { data, error } = await adminClient
    .from("profiles")
    .upsert(
      {
        id: SHARED_PROFILE_ID,
        full_name: full_name ?? null,
        headline_en: headline_en ?? null,
        headline_fr: headline_fr ?? null,
        bio_en: bio_en ?? null,
        bio_fr: bio_fr ?? null,
        location: location ?? null,
        avatar_url: avatar_url ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    )
    .select()
    .single();

  if (error) {
    return apiError(error.message);
  }

  revalidatePortfolioPages();
  return apiSuccess(data);
}
