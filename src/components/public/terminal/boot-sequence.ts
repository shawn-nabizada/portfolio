import type { Locale } from "@/lib/i18n";

export const BOOT_STAGGER_MS = 280;

export function getBootLines(locale: Locale): string[] {
  const baseBootLines =
    locale === "fr"
      ? [
          "[OK] Initialisation de portfolio-sh v1.0...",
          "[OK] Chargement des données du portfolio...",
          "[OK] Établissement d'une connexion sécurisée...",
          "[OK] Shell prêt.",
        ]
      : [
          "[OK] Initializing portfolio-sh v1.0...",
          "[OK] Loading portfolio data...",
          "[OK] Establishing secure connection...",
          "[OK] Shell ready.",
        ];

  const welcome =
    locale === "fr"
      ? "Bienvenue dans portfolio-sh. Tapez 'help' pour commencer."
      : "Welcome to portfolio-sh. Type 'help' to get started.";

  return [...baseBootLines, "", welcome];
}
