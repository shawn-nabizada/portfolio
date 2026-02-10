import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminUser } from "@/lib/auth/admin";
import { apiError, apiSuccess } from "@/lib/http/api";
import { TESTIMONIAL_MAX_CHARS } from "@/lib/constants/testimonials";

const MIN_FORM_FILL_MS = 3000;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 5;

const testimonialRateLimitStore = new Map<string, { count: number; resetAt: number }>();

function getClientIp(request: NextRequest): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const first = forwardedFor.split(",")[0]?.trim();
    if (first) return first;
  }

  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;

  return "unknown";
}

function isRateLimited(ip: string, now = Date.now()): boolean {
  for (const [entryIp, entry] of testimonialRateLimitStore.entries()) {
    if (entry.resetAt <= now) {
      testimonialRateLimitStore.delete(entryIp);
    }
  }

  const existing = testimonialRateLimitStore.get(ip);
  if (!existing) {
    testimonialRateLimitStore.set(ip, {
      count: 1,
      resetAt: now + RATE_LIMIT_WINDOW_MS,
    });
    return false;
  }

  if (existing.resetAt <= now) {
    testimonialRateLimitStore.set(ip, {
      count: 1,
      resetAt: now + RATE_LIMIT_WINDOW_MS,
    });
    return false;
  }

  if (existing.count >= RATE_LIMIT_MAX_REQUESTS) {
    return true;
  }

  existing.count += 1;
  return false;
}

function silentSpamSuccess() {
  return apiSuccess({ accepted: true }, 201);
}

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
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return apiError("invalid json body", 400);
  }

  const {
    author_name,
    author_title,
    author_company,
    content,
    content_en,
    content_fr,
    website,
    form_started_at,
  } = body as {
    author_name?: unknown;
    author_title?: unknown;
    author_company?: unknown;
    content?: unknown;
    content_en?: unknown;
    content_fr?: unknown;
    website?: unknown;
    form_started_at?: unknown;
  };

  const normalizedAuthorName =
    typeof author_name === "string" ? author_name.trim() : "";
  const normalizedContent =
    typeof content === "string" ? content.trim() : "";
  const normalizedContentEn =
    typeof content_en === "string" ? content_en.trim() : "";
  const normalizedContentFr =
    typeof content_fr === "string" ? content_fr.trim() : "";
  const normalizedAuthorTitle =
    typeof author_title === "string" ? author_title.trim() : "";
  const normalizedAuthorCompany =
    typeof author_company === "string" ? author_company.trim() : "";
  const normalizedWebsite =
    typeof website === "string" ? website.trim() : "";
  const formStartedAt =
    typeof form_started_at === "number" && Number.isFinite(form_started_at)
      ? form_started_at
      : null;

  const finalContentEn = normalizedContent || normalizedContentEn;
  const finalContentFr = normalizedContent
    ? normalizedContent
    : normalizedContentFr || null;

  if (!normalizedAuthorName || !finalContentEn) {
    return apiError("author_name and content (or content_en) are required", 400);
  }

  if (
    finalContentEn.length > TESTIMONIAL_MAX_CHARS ||
    (finalContentFr !== null && finalContentFr.length > TESTIMONIAL_MAX_CHARS)
  ) {
    return apiError(
      `testimonial content must be ${TESTIMONIAL_MAX_CHARS} characters or fewer`,
      400
    );
  }

  const supabase = await createClient();
  let honeypotEnabled = false;

  const { data: settingsData, error: settingsError } = await supabase
    .from("site_settings")
    .select("key, value")
    .in("key", ["contact_honeypot_enabled"]);

  if (settingsError) {
    console.error("Failed to load testimonial honeypot settings", settingsError.message);
  } else {
    honeypotEnabled = (settingsData ?? []).some(
      (entry) => entry.key === "contact_honeypot_enabled" && entry.value === true
    );
  }

  if (honeypotEnabled) {
    if (normalizedWebsite.length > 0) {
      return silentSpamSuccess();
    }

    const now = Date.now();
    if (formStartedAt !== null && now - formStartedAt < MIN_FORM_FILL_MS) {
      return silentSpamSuccess();
    }

    if (isRateLimited(getClientIp(request), now)) {
      return silentSpamSuccess();
    }
  }

  const { data, error } = await supabase
    .from("testimonials")
    .insert({
      author_name: normalizedAuthorName,
      author_title: normalizedAuthorTitle || null,
      author_company: normalizedAuthorCompany || null,
      content_en: finalContentEn,
      content_fr: finalContentFr,
      status: "pending",
    })
    .select()
    .single();

  if (error) {
    return apiError(error.message);
  }

  return apiSuccess(data, 201);
}
