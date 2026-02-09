import type { Locale, Translations } from "@/lib/i18n";
import type { Profile } from "@/lib/types/database";
import { AnimatedSection } from "@/components/public/animated-section";

export function AboutSection({
  locale,
  profile,
  t,
}: {
  locale: Locale;
  profile: Profile | null;
  t: Pick<Translations, "nav">;
}) {
  const bio = locale === "fr" ? profile?.bio_fr : profile?.bio_en;
  const bioText = bio || profile?.bio_en || "";
  const aboutFile = locale === "fr" ? "about.fr.txt" : "about.txt";

  return (
    <AnimatedSection id="about" className="space-y-4 py-14">
      <h2 className="terminal-heading text-2xl font-semibold tracking-tight text-foreground">
        <span className="heading-prefix" aria-hidden="true">{"// "}</span>{t.nav.about}
      </h2>
      <div className="terminal-card card-3d-hover rounded-lg bg-[var(--card)] p-5 font-mono">
        <p className="text-xs text-terminal-dim">
          <span className="text-terminal-green">shawn_nabizada@portfolio</span>
          <span className="text-terminal-dim">:</span>
          <span className="text-terminal-cyan">~</span>
          <span className="text-terminal-dim">$ </span>
          cat {aboutFile}
        </p>
        <div className="mt-3 border-l-2 border-terminal-green/20 pl-4">
          <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
            {bioText}
          </p>
        </div>
        <p className="mt-4 text-xs text-terminal-dim">
          <span className="text-terminal-green">shawn_nabizada@portfolio</span>
          <span className="text-terminal-dim">:</span>
          <span className="text-terminal-cyan">~</span>
          <span className="text-terminal-dim">$ </span>
          <span className="inline-block h-[1em] w-0 border-l-2 align-middle" style={{ borderLeftColor: "var(--terminal-green)", animation: "blink 1s step-end infinite" }} aria-hidden="true" />
        </p>
      </div>
    </AnimatedSection>
  );
}
