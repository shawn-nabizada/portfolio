import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminUser } from "@/lib/auth/admin";
import { apiError, apiSuccess } from "@/lib/http/api";
import { revalidatePortfolioPages } from "@/lib/revalidation";

export async function GET() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("projects")
    .select("*, project_skills(skill_id, skills(*))")
    .order("order");

  if (error) {
    return apiError(error.message);
  }

  const projects = (data ?? []).map((project) => {
    const { project_skills, ...rest } = project;
    const skills = (project_skills ?? [])
      .map((ps: { skill_id: string; skills: Record<string, unknown> | null }) => ps.skills)
      .filter(Boolean);
    return { ...rest, skills };
  });

  return apiSuccess(projects);
}

export async function POST(request: NextRequest) {
  const adminCheck = await requireAdminUser();
  if (!adminCheck.ok) {
    return adminCheck.response;
  }

  const body = await request.json();
  const {
    title_en,
    title_fr,
    description_en,
    description_fr,
    image_url,
    project_url,
    github_url,
    featured,
    order,
    skill_ids,
  } = body;

  if (!title_en || !title_fr) {
    return apiError("title_en and title_fr are required", 400);
  }

  const adminClient = createAdminClient();

  const { data, error } = await adminClient
    .from("projects")
    .insert({
      title_en,
      title_fr,
      description_en: description_en || null,
      description_fr: description_fr || null,
      image_url: image_url || null,
      project_url: project_url || null,
      github_url: github_url || null,
      featured: featured ?? false,
      order: order ?? 0,
    })
    .select()
    .single();

  if (error) {
    return apiError(error.message);
  }

  if (Array.isArray(skill_ids) && skill_ids.length > 0) {
    const projectSkillRows = skill_ids.map((skill_id: string) => ({
      project_id: data.id,
      skill_id,
    }));

    const { error: skillsError } = await adminClient
      .from("project_skills")
      .insert(projectSkillRows);

    if (skillsError) {
      return apiError(skillsError.message);
    }
  }

  revalidatePortfolioPages();
  return apiSuccess(data, 201);
}
