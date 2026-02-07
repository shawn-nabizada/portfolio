import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { locales, defaultLocale, LOCALE_COOKIE, type Locale } from "@/lib/i18n/config";

function getLocaleFromRequest(request: NextRequest): Locale {
  // 1. Check cookie
  const cookieLocale = request.cookies.get(LOCALE_COOKIE)?.value;
  if (cookieLocale && locales.includes(cookieLocale as Locale)) {
    return cookieLocale as Locale;
  }

  // 2. Check Accept-Language header
  const acceptLang = request.headers.get("accept-language");
  if (acceptLang) {
    const browserLocale = acceptLang.split(",")[0]?.split("-")[0];
    if (browserLocale && locales.includes(browserLocale as Locale)) {
      return browserLocale as Locale;
    }
  }

  // 3. Default
  return defaultLocale;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip static files, API routes, and Next.js internals
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // Check if pathname already has a locale prefix
  const pathnameLocale = locales.find(
    (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
  );

  // No locale in URL — detect and redirect
  if (!pathnameLocale) {
    const locale = getLocaleFromRequest(request);
    const redirectUrl = new URL(`/${locale}${pathname}`, request.url);
    return NextResponse.redirect(redirectUrl);
  }

  // Refresh Supabase session
  const { user, supabaseResponse } = await updateSession(request);

  // Auth guard for admin routes
  const isAdminRoute = pathname.startsWith(`/${pathnameLocale}/admin`);
  const isLoginRoute = pathname === `/${pathnameLocale}/admin/login`;

  if (isAdminRoute && !isLoginRoute && !user) {
    // Not authenticated — redirect to login
    const loginUrl = new URL(`/${pathnameLocale}/admin/login`, request.url);
    return NextResponse.redirect(loginUrl);
  }

  if (isLoginRoute && user) {
    // Already authenticated — redirect to dashboard
    const dashboardUrl = new URL(`/${pathnameLocale}/admin/dashboard`, request.url);
    return NextResponse.redirect(dashboardUrl);
  }

  return supabaseResponse;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
