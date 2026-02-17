import type { Locale } from "@/lib/i18n";

export function resolvePreviewLanguage(locale: string): Locale {
  return locale === "fr" ? "fr" : "en";
}

export function localizedText(
  language: Locale,
  english: string | null | undefined,
  french: string | null | undefined
): string {
  const primary = language === "fr" ? french : english;
  const fallback = language === "fr" ? english : french;
  return primary ?? fallback ?? "";
}

export function localizedArray(
  language: Locale,
  english: string[] | null | undefined,
  french: string[] | null | undefined
): string[] {
  const primary = language === "fr" ? french : english;
  const fallback = language === "fr" ? english : french;

  if (Array.isArray(primary)) {
    return primary;
  }

  if (Array.isArray(fallback)) {
    return fallback;
  }

  return [];
}
