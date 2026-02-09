"use client";

import { usePathname, useRouter } from "next/navigation";
import { LOCALE_COOKIE, type Locale } from "@/lib/i18n";

export function LocaleToggle({ locale }: { locale: Locale }) {
  const router = useRouter();
  const pathname = usePathname();

  const targetLocale: Locale = locale === "en" ? "fr" : "en";

  const toggleLocale = () => {
    const nextPath = pathname.replace(/^\/(en|fr)(?=\/|$)/, `/${targetLocale}`);
    const resolvedPath =
      nextPath === pathname ? `/${targetLocale}${pathname}` : nextPath;
    document.cookie = `${LOCALE_COOKIE}=${targetLocale}; path=/; max-age=${60 * 60 * 24 * 365}`;
    router.replace(resolvedPath);
    router.refresh();
  };

  return (
    <button
      onClick={toggleLocale}
      aria-label={locale === "en" ? "Passer au français" : "Switch to English"}
      className="relative flex items-center justify-center w-9 h-9 rounded-md border border-terminal-border text-muted-foreground hover:text-terminal-green hover:border-terminal-green transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 font-mono text-sm"
    >
      {targetLocale.toUpperCase()}
    </button>
  );
}
