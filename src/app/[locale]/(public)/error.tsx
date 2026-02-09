"use client";

import { useMemo } from "react";
import { usePathname } from "next/navigation";
import { getTranslations, type Locale } from "@/lib/i18n";

function localeFromPathname(pathname: string): Locale {
  const segment = pathname.split("/").filter(Boolean)[0];
  return segment === "fr" ? "fr" : "en";
}

export default function PublicPageError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const pathname = usePathname();
  const locale = useMemo(() => localeFromPathname(pathname), [pathname]);
  const t = getTranslations(locale);

  return (
    <section className="py-14">
      <div className="terminal-card max-w-2xl space-y-4 rounded-xl p-6">
        <h2 className="terminal-heading text-2xl font-semibold text-foreground">
          {t.common.errorOccurred}
        </h2>
        <p className="text-sm text-muted-foreground">
          {locale === "fr"
            ? "Le contenu n'a pas pu être chargé. Veuillez réessayer."
            : "We couldn't load the content. Please try again."}
        </p>
        <button type="button" className="terminal-btn" onClick={reset}>
          {locale === "fr" ? "Réessayer" : "Retry"}
        </button>
      </div>
      <p className="sr-only">{error.message}</p>
    </section>
  );
}
