import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminUser } from "@/lib/auth/admin";
import { apiError, apiSuccess } from "@/lib/http/api";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminCheck = await requireAdminUser();
  if (!adminCheck.ok) {
    return adminCheck.response;
  }

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const read = body.read ?? true;

  const adminClient = createAdminClient();
  const { data, error } = await adminClient
    .from("contact_messages")
    .update({ read: Boolean(read) })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return apiError(error.message);
  }

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
  const { error } = await adminClient.from("contact_messages").delete().eq("id", id);

  if (error) {
    return apiError(error.message);
  }

  return apiSuccess({ success: true });
}
