"use client";

import { useState } from "react";
import type { Locale } from "@/lib/i18n";
import type { Profile } from "@/lib/types/database";
import { AnimatedSection } from "@/components/public/animated-section";
import { TypewriterText } from "@/components/public/typewriter-text";

export function HeroSection({
  locale,
  profile,
  settings,
}: {
  locale: Locale;
  profile: Profile | null;
  settings: Record<string, unknown>;
}) {
  const heroTitle = settings.hero_title as { en?: string; fr?: string } | undefined;
  const heroSubtitle = settings.hero_subtitle as
    | { en?: string; fr?: string }
    | undefined;
  const fallbackTitle = profile?.full_name
    ? locale === "fr"
      ? `Bonjour, je suis ${profile.full_name}`
      : `Hi, I'm ${profile.full_name}`
    : "Portfolio";
  const fallbackAvatarAlt = locale === "fr" ? "Avatar du profil" : "Profile avatar";

  const title = (locale === "fr" ? heroTitle?.fr : heroTitle?.en) || fallbackTitle;
  const subtitle =
    (locale === "fr" ? heroSubtitle?.fr : heroSubtitle?.en) ||
    (locale === "fr" ? profile?.headline_fr : profile?.headline_en) ||
    (profile?.headline_en ?? "");

  const [titleDone, setTitleDone] = useState(false);

  return (
    <AnimatedSection className="relative overflow-hidden py-20 md:py-28">
      {/* Perspective grid background */}
      <div className="perspective-grid" aria-hidden="true" />

      {/* CRT vignette — dark only */}
      <div className="crt-vignette pointer-events-none absolute inset-0 hidden dark:block" aria-hidden="true" />

      <div className="relative z-10 flex flex-col gap-8 md:flex-row md:items-center md:justify-between" style={{ perspective: "800px" }}>
        <div className="space-y-4" style={{ transformStyle: "preserve-3d" }}>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-terminal-dim">
            {profile?.location ? `$ ${profile.location}` : ""}
          </p>
          <h1 className="terminal-heading bg-transparent text-4xl font-bold tracking-tight sm:text-5xl text-foreground" aria-label={title}>
            <TypewriterText
              text={title}
              speed={90}
              delay={300}
              onDone={() => setTitleDone(true)}
            />
          </h1>
          {subtitle && (
            <p className="max-w-2xl font-sans text-lg text-muted-foreground" aria-label={subtitle}>
              {titleDone ? (
                <TypewriterText
                  text={subtitle}
                  speed={60}
                  delay={0}
                />
              ) : (
                <span className="opacity-0">{subtitle}</span>
              )}
            </p>
          )}
        </div>

        {profile?.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={profile.avatar_url}
            alt={profile.full_name || fallbackAvatarAlt}
            className="avatar-float h-32 w-32 rounded-full border-2 border-terminal-green/40 object-cover shadow-[0_0_20px_var(--terminal-glow)]"
          />
        ) : null}
      </div>
    </AnimatedSection>
  );
}
