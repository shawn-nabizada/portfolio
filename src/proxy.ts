import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import {
  locales,
  defaultLocale,
  LOCALE_COOKIE,
  type Locale,
} from "@/lib/i18n/config";
import { isAdminUser } from "@/lib/auth/admin";

function getLocaleFromRequest(request: NextRequest): Locale {
  const cookieLocale = request.cookies.get(LOCALE_COOKIE)?.value;
  if (cookieLocale && locales.includes(cookieLocale as Locale)) {
    return cookieLocale as Locale;
  }

  const acceptLang = request.headers.get("accept-language");
  if (acceptLang) {
    const browserLocale = acceptLang.split(",")[0]?.split("-")[0];
    if (browserLocale && locales.includes(browserLocale as Locale)) {
      return browserLocale as Locale;
    }
  }

  return defaultLocale;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  const pathnameLocale = locales.find(
    (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
  );

  if (!pathnameLocale) {
    const locale = getLocaleFromRequest(request);
    const redirectUrl = new URL(`/${locale}${pathname}`, request.url);
    return NextResponse.redirect(redirectUrl);
  }

  const { user, supabaseResponse } = await updateSession(request);

  const isAdminRoute = pathname.startsWith(`/${pathnameLocale}/admin`);
  const isLoginRoute = pathname === `/${pathnameLocale}/admin/login`;

  if (isAdminRoute && !isLoginRoute && !user) {
    const loginUrl = new URL(`/${pathnameLocale}/admin/login`, request.url);
    return NextResponse.redirect(loginUrl);
  }

  if (isAdminRoute && !isLoginRoute && user && !isAdminUser(user)) {
    const loginUrl = new URL(`/${pathnameLocale}/admin/login`, request.url);
    loginUrl.searchParams.set("error", "forbidden");
    return NextResponse.redirect(loginUrl);
  }

  if (isLoginRoute && user && isAdminUser(user)) {
    const dashboardUrl = new URL(`/${pathnameLocale}/admin/dashboard`, request.url);
    return NextResponse.redirect(dashboardUrl);
  }

  return supabaseResponse;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
