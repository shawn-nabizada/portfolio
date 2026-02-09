import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminUser } from "@/lib/auth/admin";
import { apiError, apiSuccess } from "@/lib/http/api";
import { revalidatePortfolioPages } from "@/lib/revalidation";

export async function GET() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("skill_categories")
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
  const { name_en, name_fr, order } = body;

  if (!name_en || !name_fr) {
    return apiError("name_en and name_fr are required", 400);
  }

  const adminClient = createAdminClient();

  const { data, error } = await adminClient
    .from("skill_categories")
    .insert({
      name_en,
      name_fr,
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
