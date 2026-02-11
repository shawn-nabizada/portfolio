import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminUser } from "@/lib/auth/admin";
import { apiError, apiSuccess } from "@/lib/http/api";
import { revalidatePortfolioPages } from "@/lib/revalidation";

function normalizeMonthDate(value: string | null | undefined): string | null {
  if (!value) return null;
  return /^\d{4}-\d{2}$/.test(value) ? `${value}-01` : value;
}

function normalizeBulletList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

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
  const {
    title_en,
    title_fr,
    description_en,
    description_fr,
    project_bullets_en,
    project_bullets_fr,
    image_url,
    project_url,
    github_url,
    start_date,
    end_date,
    featured,
    order,
    skill_ids,
  } = body;

  const normalizedBulletsEn = normalizeBulletList(project_bullets_en);
  const normalizedBulletsFr = normalizeBulletList(project_bullets_fr);

  if (!title_en || !title_fr || !start_date || normalizedBulletsEn.length === 0 || normalizedBulletsFr.length === 0) {
    return apiError(
      "title_en, title_fr, start_date, project_bullets_en, and project_bullets_fr are required",
      400
    );
  }

  const adminClient = createAdminClient();

  const { data, error } = await adminClient
    .from("projects")
    .update({
      title_en,
      title_fr,
      description_en: description_en || null,
      description_fr: description_fr || null,
      project_bullets_en: normalizedBulletsEn,
      project_bullets_fr: normalizedBulletsFr,
      image_url: image_url || null,
      project_url: project_url || null,
      github_url: github_url || null,
      start_date: normalizeMonthDate(start_date),
      end_date: normalizeMonthDate(end_date),
      featured: featured ?? false,
      order: order ?? 0,
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return apiError(error.message);
  }

  if (skill_ids !== undefined && Array.isArray(skill_ids)) {
    const { error: deleteError } = await adminClient
      .from("project_skills")
      .delete()
      .eq("project_id", id);

    if (deleteError) {
      return apiError(deleteError.message);
    }

    if (skill_ids.length > 0) {
      const projectSkillRows = skill_ids.map((skill_id: string) => ({
        project_id: id,
        skill_id,
      }));

      const { error: insertError } = await adminClient
        .from("project_skills")
        .insert(projectSkillRows);

      if (insertError) {
        return apiError(insertError.message);
      }
    }
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

  const { error } = await adminClient.from("projects").delete().eq("id", id);

  if (error) {
    return apiError(error.message);
  }

  revalidatePortfolioPages();
  return apiSuccess({ success: true });
}
