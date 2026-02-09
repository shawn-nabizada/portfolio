import type { Locale } from "@/lib/i18n";

export function PublicFooter({
  locale,
  footerText,
}: {
  locale: Locale;
  footerText?: { en?: string; fr?: string };
}) {
  const text = locale === "fr" ? footerText?.fr : footerText?.en;
  const fallbackText =
    locale === "fr"
      ? "Créé avec Next.js et Supabase"
      : "Built with Next.js and Supabase";

  return (
    <footer className="border-t border-terminal-border">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-6 sm:px-6 lg:px-8">
        <p className="font-mono text-xs text-terminal-dim">
          {text || fallbackText}
        </p>
        <p className="font-mono text-xs text-terminal-dim">
          &copy; {new Date().getFullYear()}
        </p>
      </div>
    </footer>
  );
}
