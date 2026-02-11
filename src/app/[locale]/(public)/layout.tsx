import { getTranslations, type Locale } from "@/lib/i18n";
import { PublicNavbar } from "@/components/public/navbar";
import { CursorGlitchTrail } from "@/components/public/cursor-glitch-trail";
import { DvdVolleyballBounce } from "@/components/public/dvd-volleyball-bounce";
import { getPortfolioData } from "@/lib/portfolio-data";

function toNumberSetting(
  value: unknown,
  fallback: number,
  min: number,
  max: number
): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, value));
}

export default async function PublicLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const typedLocale = locale as Locale;
  const t = getTranslations(typedLocale);
  const portfolioData = await getPortfolioData(typedLocale);
  const hobbyIconNames = portfolioData.hobbies.map((item) => item.icon);
  const iconSize = toNumberSetting(
    portfolioData.settings.dvd_bounce_icon_size,
    44,
    20,
    128
  );
  const iconOpacity = toNumberSetting(
    portfolioData.settings.dvd_bounce_icon_opacity,
    0.2,
    0.02,
    0.95
  );
  const trailEnabled = portfolioData.settings.dvd_bounce_trail_enabled !== false;
  const trailDensity = toNumberSetting(
    portfolioData.settings.dvd_bounce_trail_density,
    1,
    0.1,
    3
  );
  const trailOpacity = toNumberSetting(
    portfolioData.settings.dvd_bounce_trail_opacity,
    1,
    0,
    3
  );
  const trailLength = toNumberSetting(
    portfolioData.settings.dvd_bounce_trail_length,
    1,
    0.25,
    3
  );

  return (
    <div className="scanline-overlay noise-bg min-h-screen overflow-x-clip bg-background text-foreground">
      <a href="#main-content" className="skip-to-content">
        {locale === "fr" ? "Aller au contenu" : "Skip to content"}
      </a>
      <DvdVolleyballBounce
        iconNames={hobbyIconNames}
        size={iconSize}
        iconOpacity={iconOpacity}
        trailEnabled={trailEnabled}
        trailDensity={trailDensity}
        trailOpacity={trailOpacity}
        trailLength={trailLength}
      />
      <CursorGlitchTrail />
      <PublicNavbar locale={typedLocale} nav={t.nav} />
      <main id="main-content" className="public-typography-scale relative z-10 mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">{children}</main>
    </div>
  );
}
