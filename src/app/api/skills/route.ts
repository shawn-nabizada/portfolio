import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const adminClient = createAdminClient();

  const { data, error } = await adminClient
    .from("skills")
    .select("*, category:skill_categories(*)")
    .order("order");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
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
  const { name_en, name_fr, category_id, order } = body;

  if (!name_en || !name_fr) {
    return NextResponse.json(
      { error: "name_en and name_fr are required" },
      { status: 400 }
    );
  }

  const adminClient = createAdminClient();

  const { data, error } = await adminClient
    .from("skills")
    .insert({
      name_en,
      name_fr,
      category_id: category_id || null,
      order: order ?? 0,
    })
    .select("*, category:skill_categories(*)")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
