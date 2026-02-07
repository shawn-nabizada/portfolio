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

  const adminClient = createAdminClient();

  const { data, error } = await adminClient
    .from("experience")
    .update({
      ...(company !== undefined && { company }),
      ...(position_en !== undefined && { position_en }),
      ...(position_fr !== undefined && { position_fr }),
      ...(description_en !== undefined && { description_en: description_en || null }),
      ...(description_fr !== undefined && { description_fr: description_fr || null }),
      ...(location !== undefined && { location: location || null }),
      ...(start_date !== undefined && { start_date }),
      ...(end_date !== undefined && { end_date: end_date || null }),
      ...(order !== undefined && { order }),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
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
    .from("experience")
    .delete()
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
