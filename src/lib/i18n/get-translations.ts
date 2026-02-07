import type { Locale } from "./config";
import { en } from "./translations/en";
import { fr } from "./translations/fr";

const translations = { en, fr } as const;

export function getTranslations(locale: Locale) {
  return translations[locale];
}
