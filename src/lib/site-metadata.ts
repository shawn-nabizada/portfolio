import type { Metadata } from "next";
import type { Locale } from "@/lib/i18n";
import { locales } from "@/lib/i18n";
import { getPortfolioData } from "@/lib/portfolio-data";

const DEFAULT_TITLE = "Portfolio";

function getSiteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
}

export function localizedValue(value: unknown, locale: Locale): string | undefined {
  if (!value || typeof value !== "object") return undefined;
  const obj = value as { en?: string; fr?: string };
  return locale === "fr" ? obj.fr || obj.en : obj.en || obj.fr;
}

function fallbackDescription(locale: Locale): string {
  return locale === "fr" ? "Portfolio personnel" : "Personal portfolio";
}

function withVersionParam(url: string, version: string | null | undefined): string {
  if (!version) return url;
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}v=${encodeURIComponent(version)}`;
}

function buildAlternates(locale: Locale): Metadata["alternates"] {
  const siteUrl = getSiteUrl();
  const languages: Record<string, string> = {};
  for (const loc of locales) {
    languages[loc] = `${siteUrl}/${loc}`;
  }
  languages["x-default"] = `${siteUrl}/en`;

  return {
    canonical: `${siteUrl}/${locale}`,
    languages,
  };
}

export async function getLocaleMetadata(locale: Locale): Promise<Metadata> {
  const fallback = fallbackDescription(locale);
  const siteUrl = getSiteUrl();
  const alternates = buildAlternates(locale);

  try {
    const data = await getPortfolioData(locale);
    const title = localizedValue(data.settings.site_title, locale) || DEFAULT_TITLE;
    const description = localizedValue(data.settings.site_description, locale) || fallback;
    const avatarUrl = data.profile?.avatar_url || undefined;
    const avatarIcon = avatarUrl
      ? withVersionParam(avatarUrl, data.profile?.updated_at)
      : undefined;

    return {
      title,
      description,
      ...(avatarIcon
        ? {
            icons: {
              icon: avatarIcon,
              shortcut: avatarIcon,
              apple: avatarIcon,
            },
          }
        : {}),
      alternates,
      openGraph: {
        title,
        description,
        type: "website",
        locale,
        url: `${siteUrl}/${locale}`,
        siteName: title,
      },
      twitter: {
        card: "summary",
        title,
        description,
      },
    };
  } catch (error) {
    console.error("Failed to load locale metadata from portfolio data", error);
  }

  return {
    title: DEFAULT_TITLE,
    description: fallback,
    alternates,
    openGraph: {
      title: DEFAULT_TITLE,
      description: fallback,
      type: "website",
      locale,
      url: `${siteUrl}/${locale}`,
    },
    twitter: {
      card: "summary",
      title: DEFAULT_TITLE,
      description: fallback,
    },
  };
}
