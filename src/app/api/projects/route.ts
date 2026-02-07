import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const adminClient = createAdminClient();

  const { data, error } = await adminClient
    .from("projects")
    .select("*, project_skills(skill_id, skills(*))")
    .order("order");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Flatten nested project_skills into a skills[] array on each project
  const projects = (data ?? []).map((project) => {
    const { project_skills, ...rest } = project;
    const skills = (project_skills ?? [])
      .map((ps: { skill_id: string; skills: Record<string, unknown> | null }) => ps.skills)
      .filter(Boolean);
    return { ...rest, skills };
  });

  return NextResponse.json(projects);
}

export async function POST(request: NextRequest) {
  // Auth check
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
    return NextResponse.json(
      { error: "title_en and title_fr are required" },
      { status: 400 }
    );
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
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Insert project_skills rows if skill_ids provided
  if (skill_ids && Array.isArray(skill_ids) && skill_ids.length > 0) {
    const projectSkillRows = skill_ids.map((skill_id: string) => ({
      project_id: data.id,
      skill_id,
    }));

    const { error: skillsError } = await adminClient
      .from("project_skills")
      .insert(projectSkillRows);

    if (skillsError) {
      return NextResponse.json(
        { error: skillsError.message },
        { status: 500 }
      );
    }
  }

  return NextResponse.json(data, { status: 201 });
}
