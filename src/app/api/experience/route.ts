import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const adminClient = createAdminClient();

  const { data, error } = await adminClient
    .from("experience")
    .select("*")
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
  const {
    company,
    position_en,
    position_fr,
    description_en,
    description_fr,
    location,
    start_date,
    end_date,
    order,
  } = body;

  if (!company || !position_en || !position_fr || !start_date) {
    return NextResponse.json(
      { error: "company, position_en, position_fr, and start_date are required" },
      { status: 400 }
    );
  }

  const adminClient = createAdminClient();

  const { data, error } = await adminClient
    .from("experience")
    .insert({
      company,
      position_en,
      position_fr,
      description_en: description_en || null,
      description_fr: description_fr || null,
      location: location || null,
      start_date,
      end_date: end_date || null,
      order: order ?? 0,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
