import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminUser } from "@/lib/auth/admin";
import { apiError, apiSuccess } from "@/lib/http/api";
import { revalidatePortfolioPages } from "@/lib/revalidation";
import { getNextOrderValue } from "@/lib/admin/duplicate";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminCheck = await requireAdminUser();
  if (!adminCheck.ok) {
    return adminCheck.response;
  }

  const { id } = await params;
  const adminClient = createAdminClient();

  const { data: source, error: sourceError } = await adminClient
    .from("projects")
    .select(
      "title_en,title_fr,description_en,description_fr,project_bullets_en,project_bullets_fr,image_url,project_url,github_url,start_date,end_date,featured"
    )
    .eq("id", id)
    .maybeSingle();

  if (sourceError) {
    return apiError(sourceError.message);
  }

  if (!source) {
    return apiError("project not found", 404);
  }

  const nextOrder = await getNextOrderValue(adminClient, "projects");

  const { data: created, error: insertError } = await adminClient
    .from("projects")
    .insert({
      ...source,
      order: nextOrder,
    })
    .select()
    .single();

  if (insertError) {
    return apiError(insertError.message);
  }

  const { data: existingSkills, error: skillsError } = await adminClient
    .from("project_skills")
    .select("skill_id")
    .eq("project_id", id);

  if (skillsError) {
    return apiError(skillsError.message);
  }

  if ((existingSkills?.length ?? 0) > 0) {
    const rows = existingSkills!.map((row) => ({
      project_id: created.id,
      skill_id: row.skill_id,
    }));

    const { error: relError } = await adminClient.from("project_skills").insert(rows);

    if (relError) {
      return apiError(relError.message);
    }
  }

  revalidatePortfolioPages();
  return apiSuccess(created, 201);
}
