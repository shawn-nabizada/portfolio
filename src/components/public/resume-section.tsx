"use client";

import { Download } from "lucide-react";
import type { Locale, Translations } from "@/lib/i18n";
import type { Resume } from "@/lib/types/database";
import { AnimatedSection } from "@/components/public/animated-section";
import { fetchMutation } from "@/lib/http/mutation";

export function ResumeSection({
  locale,
  items,
  t,
}: {
  locale: Locale;
  items: Resume[];
  t: Pick<Translations, "resume">;
}) {
  const trackDownload = async (language: "en" | "fr") => {
    try {
      await fetchMutation("/api/analytics/resume-download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          locale,
          path: `/${locale}`,
          language,
        }),
      });
    } catch {
      // Ignore analytics failures on download.
    }
  };

  return (
    <AnimatedSection id="resume" className="space-y-4 py-14">
      <h2 className="terminal-heading text-2xl font-semibold tracking-tight text-foreground">
        <span className="heading-prefix" aria-hidden="true">{"// "}</span>{t.resume.title}
      </h2>
      <div className="flex flex-wrap gap-3">
        {items.map((item) => (
          <a
            key={item.id}
            href={item.file_url}
            download={item.file_name}
            target="_blank"
            rel="noreferrer"
            onClick={() => trackDownload(item.language)}
            className="terminal-card card-3d-hover inline-flex items-center gap-2 rounded-lg px-4 py-2.5 font-mono text-sm text-terminal-cyan hover:text-terminal-green transition-colors"
          >
            <Download className="h-4 w-4" />
            $ {locale === "fr" ? "télécharger" : "download"} {item.file_name || `resume_${item.language}.pdf`}
          </a>
        ))}
      </div>
    </AnimatedSection>
  );
}
