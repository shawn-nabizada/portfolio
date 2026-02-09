import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminUser } from "@/lib/auth/admin";
import { apiError, apiSuccess } from "@/lib/http/api";
import { revalidatePortfolioPages } from "@/lib/revalidation";

export async function GET() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("skills")
    .select("*, category:skill_categories(*)")
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
