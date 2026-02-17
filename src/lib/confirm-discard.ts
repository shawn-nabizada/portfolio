import type { Locale } from "@/lib/i18n";

export function confirmDiscardChanges(locale: Locale): boolean {
  if (typeof window === "undefined") {
    return true;
  }

  return window.confirm(
    locale === "fr"
      ? "Vous avez des modifications non enregistrées. Fermer sans sauvegarder?"
      : "You have unsaved changes. Close without saving?"
  );
}
