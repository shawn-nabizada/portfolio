import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminUser } from "@/lib/auth/admin";
import { apiError, apiSuccess } from "@/lib/http/api";
import { revalidatePortfolioPages } from "@/lib/revalidation";

export async function GET() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("site_settings").select("*");

  if (error) {
    return apiError(error.message);
  }

  const settings = Object.fromEntries((data ?? []).map((entry) => [entry.key, entry.value]));
  return apiSuccess(settings);
}

export async function PUT(request: NextRequest) {
  const adminCheck = await requireAdminUser();
  if (!adminCheck.ok) {
    return adminCheck.response;
  }

  const body = await request.json();
  const { key, value } = body;

  if (!key || value === undefined) {
    return apiError("key and value are required", 400);
  }

  const adminClient = createAdminClient();
  const { data, error } = await adminClient
    .from("site_settings")
    .upsert({ key, value }, { onConflict: "key" })
    .select()
    .single();

  if (error) {
    return apiError(error.message);
  }

  revalidatePortfolioPages();
  return apiSuccess(data);
}
