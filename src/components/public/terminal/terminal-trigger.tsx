"use client";

import { useState } from "react";
import { TerminalSquare } from "lucide-react";
import type { Locale } from "@/lib/i18n";
import type { PortfolioData } from "@/lib/portfolio-data";
import { TerminalModal } from "./terminal-modal";

export function TerminalTrigger({
  locale,
  data,
}: {
  locale: Locale;
  data: PortfolioData;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="terminal-card fixed bottom-4 right-4 z-[70] flex h-12 w-12 items-center justify-center rounded-xl bg-card/95 text-terminal-cyan transition-colors hover:text-terminal-green focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terminal-green/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        aria-label={locale === "fr" ? "Ouvrir le terminal" : "Open terminal"}
      >
        <TerminalSquare className="h-5 w-5" aria-hidden="true" />
      </button>

      <TerminalModal open={open} locale={locale} data={data} onClose={() => setOpen(false)} />
    </>
  );
}
