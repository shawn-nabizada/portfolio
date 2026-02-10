import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminUser } from "@/lib/auth/admin";
import { apiError, apiSuccess } from "@/lib/http/api";
import { revalidatePortfolioPages } from "@/lib/revalidation";
import { TESTIMONIAL_MAX_CHARS } from "@/lib/constants/testimonials";

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
  const { status, author_name, author_title, author_company, content_en, content_fr } =
    body;

  if (
    status !== undefined &&
    status !== "pending" &&
    status !== "approved" &&
    status !== "rejected"
  ) {
    return apiError("Invalid status", 400);
  }

  if (
    (typeof content_en === "string" && content_en.trim().length > TESTIMONIAL_MAX_CHARS) ||
    (typeof content_fr === "string" && content_fr.trim().length > TESTIMONIAL_MAX_CHARS)
  ) {
    return apiError(
      `testimonial content must be ${TESTIMONIAL_MAX_CHARS} characters or fewer`,
      400
    );
  }

  const adminClient = createAdminClient();
  const { data, error } = await adminClient
    .from("testimonials")
    .update({
      ...(status !== undefined && { status }),
      ...(author_name !== undefined && { author_name }),
      ...(author_title !== undefined && { author_title: author_title || null }),
      ...(author_company !== undefined && { author_company: author_company || null }),
      ...(content_en !== undefined && { content_en }),
      ...(content_fr !== undefined && { content_fr: content_fr || null }),
    })
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
  const { error } = await adminClient.from("testimonials").delete().eq("id", id);

  if (error) {
    return apiError(error.message);
  }

  revalidatePortfolioPages();
  return apiSuccess({ success: true });
}
