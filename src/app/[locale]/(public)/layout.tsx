import { getTranslations, type Locale } from "@/lib/i18n";
import { PublicNavbar } from "@/components/public/navbar";

export default async function PublicLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = getTranslations(locale as Locale);

  return (
    <div className="scanline-overlay noise-bg min-h-screen bg-background text-foreground">
      <a href="#main-content" className="skip-to-content">
        {locale === "fr" ? "Aller au contenu" : "Skip to content"}
      </a>
      <PublicNavbar locale={locale as Locale} nav={t.nav} />
      <main id="main-content" className="public-typography-scale mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">{children}</main>
    </div>
  );
}
