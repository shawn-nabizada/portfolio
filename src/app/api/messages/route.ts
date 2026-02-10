import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminUser } from "@/lib/auth/admin";
import { apiError, apiSuccess } from "@/lib/http/api";

const MIN_FORM_FILL_MS = 3000;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 5;

const contactRateLimitStore = new Map<string, { count: number; resetAt: number }>();

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
  for (const [entryIp, entry] of contactRateLimitStore.entries()) {
    if (entry.resetAt <= now) {
      contactRateLimitStore.delete(entryIp);
    }
  }

  const existing = contactRateLimitStore.get(ip);
  if (!existing) {
    contactRateLimitStore.set(ip, {
      count: 1,
      resetAt: now + RATE_LIMIT_WINDOW_MS,
    });
    return false;
  }

  if (existing.resetAt <= now) {
    contactRateLimitStore.set(ip, {
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
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return apiError("invalid json body", 400);
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const subject = typeof body.subject === "string" ? body.subject.trim() : "";
  const message = typeof body.message === "string" ? body.message.trim() : "";
  const website = typeof body.website === "string" ? body.website.trim() : "";
  const formStartedAt =
    typeof body.form_started_at === "number" && Number.isFinite(body.form_started_at)
      ? body.form_started_at
      : null;

  if (!name || !email || !message) {
    return apiError("name, email, and message are required", 400);
  }

  const supabase = await createClient();
  let honeypotEnabled = false;

  const { data: settingsData, error: settingsError } = await supabase
    .from("site_settings")
    .select("key, value")
    .in("key", ["contact_honeypot_enabled"]);

  if (settingsError) {
    console.error("Failed to load contact honeypot settings", settingsError.message);
  } else {
    honeypotEnabled = (settingsData ?? []).some(
      (entry) => entry.key === "contact_honeypot_enabled" && entry.value === true
    );
  }

  if (honeypotEnabled) {
    if (website.length > 0) {
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
