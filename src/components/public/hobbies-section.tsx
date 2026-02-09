import type { Locale, Translations } from "@/lib/i18n";
import type { Hobby } from "@/lib/types/database";
import { AnimatedSection } from "@/components/public/animated-section";
import { getHobbyIcon } from "@/lib/hobby-icons";

export function HobbiesSection({
  locale,
  items,
  t,
}: {
  locale: Locale;
  items: Hobby[];
  t: Pick<Translations, "hobbies">;
}) {
  return (
    <AnimatedSection id="hobbies" className="space-y-6 py-14">
      <h2 className="terminal-heading text-2xl font-semibold tracking-tight text-foreground">
        <span className="heading-prefix" aria-hidden="true">{"// "}</span>{t.hobbies.title}
      </h2>
      <div className="flex flex-wrap gap-3">
        {items.map((item) => {
          const Icon = getHobbyIcon(item.icon);
          return (
            <div
              key={item.id}
              className="terminal-card card-3d-hover flex items-center gap-2 rounded-lg px-4 py-2.5 font-mono text-sm"
            >
              <Icon className="h-4 w-4 text-terminal-cyan" aria-hidden="true" />
              <span className="text-foreground">{locale === "fr" ? item.name_fr : item.name_en}</span>
            </div>
          );
        })}
      </div>
    </AnimatedSection>
  );
}
