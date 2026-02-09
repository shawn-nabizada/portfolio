import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminUser } from "@/lib/auth/admin";
import { apiError, apiSuccess } from "@/lib/http/api";

export async function GET(request: NextRequest) {
  const status = request.nextUrl.searchParams.get("status");
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isAdmin = isAdminUser(user);

  if (isAdmin) {
    const adminClient = createAdminClient();
    let query = adminClient
      .from("testimonials")
      .select("*")
      .order("created_at", { ascending: false });

    if (status && ["pending", "approved", "rejected"].includes(status)) {
      query = query.eq("status", status);
    }

    const { data, error } = await query;
    if (error) return apiError(error.message);
    return apiSuccess(data ?? []);
  }

  let publicQuery = supabase
    .from("testimonials")
    .select("*")
    .eq("status", "approved")
    .order("created_at", { ascending: false });

  if (status === "approved") {
    publicQuery = publicQuery.eq("status", "approved");
  }

  const { data, error } = await publicQuery;
  if (error) return apiError(error.message);
  return apiSuccess(data ?? []);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { author_name, author_title, author_company, content_en, content_fr } = body;

  if (!author_name || !content_en) {
    return apiError("author_name and content_en are required", 400);
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("testimonials")
    .insert({
      author_name,
      author_title: author_title || null,
      author_company: author_company || null,
      content_en,
      content_fr: content_fr || null,
      status: "pending",
    })
    .select()
    .single();

  if (error) {
    return apiError(error.message);
  }

  return apiSuccess(data, 201);
}
