"use client";

import { useEffect } from "react";
import type { Locale } from "@/lib/i18n";

export function ViewTracker({ locale }: { locale: Locale }) {
  useEffect(() => {
    const controller = new AbortController();

    fetch("/api/analytics/view", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locale, path: `/${locale}` }),
      signal: controller.signal,
    }).catch(() => {
      // Ignore analytics failures.
    });

    return () => controller.abort();
  }, [locale]);

  return null;
}
