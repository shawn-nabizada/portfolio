import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Auth check
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
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

  const adminClient = createAdminClient();

  const { data, error } = await adminClient
    .from("projects")
    .update({
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
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // If skill_ids is provided, replace all project_skills for this project
  if (skill_ids !== undefined && Array.isArray(skill_ids)) {
    // Delete existing project_skills
    const { error: deleteError } = await adminClient
      .from("project_skills")
      .delete()
      .eq("project_id", id);

    if (deleteError) {
      return NextResponse.json(
        { error: deleteError.message },
        { status: 500 }
      );
    }

    // Insert new project_skills
    if (skill_ids.length > 0) {
      const projectSkillRows = skill_ids.map((skill_id: string) => ({
        project_id: id,
        skill_id,
      }));

      const { error: insertError } = await adminClient
        .from("project_skills")
        .insert(projectSkillRows);

      if (insertError) {
        return NextResponse.json(
          { error: insertError.message },
          { status: 500 }
        );
      }
    }
  }

  return NextResponse.json(data);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Auth check
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const adminClient = createAdminClient();

  const { error } = await adminClient
    .from("projects")
    .delete()
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
