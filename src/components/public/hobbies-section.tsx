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
      <div className="grid gap-4 md:grid-cols-2">
        {items.map((item) => {
          const Icon = getHobbyIcon(item.icon);
          const name = locale === "fr" ? item.name_fr : item.name_en;
          const shortDescription =
            locale === "fr"
              ? item.short_description_fr || item.short_description_en
              : item.short_description_en || item.short_description_fr;

          return (
            <article
              key={item.id}
              className="terminal-card card-3d-hover flex h-full flex-col overflow-hidden rounded-xl"
            >
              <div className="h-full p-4">
                <div className="flex items-end gap-3">
                  <span
                    className="inline-flex rounded-md border border-terminal-border p-2"
                    aria-hidden="true"
                  >
                    <Icon className="h-4 w-4 text-terminal-cyan" />
                  </span>
                  <h3 className="font-mono text-lg leading-none font-semibold text-foreground">{name}</h3>
                </div>
                {shortDescription ? (
                  <p className="mt-3 pl-11 text-sm leading-relaxed text-muted-foreground">{shortDescription}</p>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>
    </AnimatedSection>
  );
}
