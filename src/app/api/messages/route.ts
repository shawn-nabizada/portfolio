import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminUser } from "@/lib/auth/admin";
import { apiError, apiSuccess } from "@/lib/http/api";

export async function GET(request: NextRequest) {
  const adminCheck = await requireAdminUser();
  if (!adminCheck.ok) {
    return adminCheck.response;
  }

  const adminClient = createAdminClient();
  const readParam = request.nextUrl.searchParams.get("read");
  let query = adminClient
    .from("contact_messages")
    .select("*")
    .order("created_at", { ascending: false });

  if (readParam === "true" || readParam === "false") {
    query = query.eq("read", readParam === "true");
  }

  const { data, error } = await query;

  if (error) {
    return apiError(error.message);
  }

  return apiSuccess(data ?? []);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { name, email, subject, message } = body;

  if (!name || !email || !message) {
    return apiError("name, email, and message are required", 400);
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("contact_messages")
    .insert({
      name,
      email,
      subject: subject || null,
      message,
      read: false,
    })
    .select()
    .single();

  if (error) {
    return apiError(error.message);
  }

  return apiSuccess(data, 201);
}
