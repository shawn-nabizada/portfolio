import type { Locale, Translations } from "@/lib/i18n";
import type { Experience } from "@/lib/types/database";
import { AnimatedSection } from "@/components/public/animated-section";

function formatMonthYear(value: string, locale: Locale): string {
  if (!value) return "";
  const normalized = value.length === 7 ? `${value}-01` : value;
  const match = normalized.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    return value;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    return value;
  }

  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleDateString(locale === "fr" ? "fr-CA" : "en-US", {
    year: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

export function ExperienceSection({
  locale,
  items,
  t,
}: {
  locale: Locale;
  items: Experience[];
  t: Pick<Translations, "experience">;
}) {
  return (
    <AnimatedSection id="experience" className="space-y-6 py-14">
      <h2 className="terminal-heading text-2xl font-semibold tracking-tight text-foreground">
        <span className="heading-prefix" aria-hidden="true">{"// "}</span>{t.experience.title}
      </h2>
      <div className="relative space-y-6 pl-6">
        {/* Timeline line */}
        <div className="absolute left-[7px] top-1 bottom-1 w-px bg-terminal-border" aria-hidden="true" />

        {items.map((item, index) => (
          <article key={item.id} className="relative">
            {/* Timeline dot */}
            <div className="timeline-dot absolute -left-6 top-3 h-3.5 w-3.5 rounded-full border-2 border-terminal-green bg-background" aria-hidden="true" />

            <div className="terminal-card card-3d-hover p-4">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-2">
                <div className="min-w-0">
                  <span className="font-mono text-[10px] text-terminal-dim">
                    [{String(index).padStart(2, "0")}]
                  </span>
                  <h3 className="font-mono text-lg font-semibold text-foreground">
                    {locale === "fr" ? item.position_fr : item.position_en}
                  </h3>
                  <p className="font-mono text-sm text-terminal-dim">
                    @{item.company}
                  </p>
                </div>
                <p className="shrink-0 font-mono text-xs text-terminal-dim">
                  {formatMonthYear(item.start_date, locale)} -{" "}
                  {item.end_date ? formatMonthYear(item.end_date, locale) : t.experience.present}
                </p>
              </div>
              {(locale === "fr" ? item.description_fr : item.description_en) ? (
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  {(locale === "fr" ? item.description_fr : item.description_en) ||
                    item.description_en}
                </p>
              ) : null}
            </div>
          </article>
        ))}
      </div>
    </AnimatedSection>
  );
}
