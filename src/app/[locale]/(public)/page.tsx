import type { Metadata } from "next";
import { getTranslations, locales, type Locale } from "@/lib/i18n";
import { getPortfolioData } from "@/lib/portfolio-data";
import type { Profile, SocialLink } from "@/lib/types/database";
import { ViewTracker } from "@/components/public/view-tracker";
import { HeroSection } from "@/components/public/hero-section";
import { SocialLinksSection } from "@/components/public/social-links-section";
import { AboutSection } from "@/components/public/about-section";
import { SkillsSection } from "@/components/public/skills-section";
import { ProjectsSection } from "@/components/public/projects-section";
import { ExperienceSection } from "@/components/public/experience-section";
import { EducationSection } from "@/components/public/education-section";
import { HobbiesSection } from "@/components/public/hobbies-section";
import { TestimonialsSection } from "@/components/public/testimonials-section";
import { ContactSection } from "@/components/public/contact-section";
import { TerminalTrigger } from "@/components/public/terminal/terminal-trigger";


function localizedValue(
  value: unknown,
  locale: Locale
): string | undefined {
  if (!value || typeof value !== "object") return undefined;
  const obj = value as { en?: string; fr?: string };
  return locale === "fr" ? obj.fr || obj.en : obj.en || obj.fr;
}

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

function buildPersonJsonLd({
  locale,
  profile,
  settings,
  socialLinks,
}: {
  locale: Locale;
  profile: Profile | null;
  settings: Record<string, unknown>;
  socialLinks: SocialLink[];
}): Record<string, unknown> | null {
  const name = profile?.full_name?.trim();
  if (!name) return null;

  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(
    /\/$/,
    ""
  );
  const headline =
    locale === "fr"
      ? profile?.headline_fr || profile?.headline_en
      : profile?.headline_en || profile?.headline_fr;
  const description =
    headline ||
    (locale === "fr" ? profile?.bio_fr || profile?.bio_en : profile?.bio_en || profile?.bio_fr) ||
    localizedValue(settings.site_description, locale);
  const sameAs = socialLinks.map((link) => link.url).filter(Boolean);

  const personJsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Person",
    name,
    url: `${siteUrl}/${locale}`,
  };

  if (description) {
    personJsonLd.description = description;
  }
  if (profile?.avatar_url) {
    personJsonLd.image = profile.avatar_url;
  }
  if (sameAs.length > 0) {
    personJsonLd.sameAs = sameAs;
  }

  return personJsonLd;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const typedLocale = locale as Locale;
  const fallbackDescription =
    typedLocale === "fr" ? "Portfolio personnel" : "Personal portfolio";

  try {
    const data = await getPortfolioData(typedLocale);

    const title = localizedValue(data.settings.site_title, typedLocale) || "Portfolio";
    const description =
      localizedValue(data.settings.site_description, typedLocale) ||
      fallbackDescription;
    const avatarIcon = data.profile?.avatar_url || undefined;

    return {
      title,
      description,
      ...(avatarIcon
        ? {
            icons: {
              icon: avatarIcon,
              shortcut: avatarIcon,
              apple: avatarIcon,
            },
          }
        : {}),
      openGraph: {
        title,
        description,
        type: "website",
        locale: typedLocale,
      },
    };
  } catch (error) {
    console.error("Failed to load metadata from portfolio data", error);
  }

  return {
    title: "Portfolio",
    description: fallbackDescription,
    openGraph: {
      title: "Portfolio",
      description: fallbackDescription,
      type: "website",
      locale: typedLocale,
    },
  };
}

export default async function PublicPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const typedLocale = locale as Locale;
  const t = getTranslations(typedLocale);
  const data = await getPortfolioData(typedLocale);
  const personJsonLd = buildPersonJsonLd({
    locale: typedLocale,
    profile: data.profile,
    settings: data.settings,
    socialLinks: data.socialLinks,
  });
  const contactHoneypotEnabled = data.settings.contact_honeypot_enabled === true;
  const contactHoneypotVisible = data.settings.contact_honeypot_visible === true;

  return (
    <>
      {personJsonLd ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(personJsonLd) }}
        />
      ) : null}
      <ViewTracker locale={typedLocale} />

      <HeroSection locale={typedLocale} profile={data.profile} settings={data.settings} />
      <SocialLinksSection links={data.socialLinks} />
      <div className="section-divider" aria-hidden="true" />
      <AboutSection
        locale={typedLocale}
        profile={data.profile}
        t={{ nav: t.nav }}
        resumes={data.resumes}
      />
      <SkillsSection categories={data.skillsByCategory} t={{ skills: t.skills }} />
      <div className="section-divider" aria-hidden="true" />
      <ProjectsSection projects={data.projects} t={{ projects: t.projects }} />
      <div className="section-divider" aria-hidden="true" />
      <ExperienceSection
        locale={typedLocale}
        items={data.experience}
        t={{ experience: t.experience }}
      />
      <EducationSection
        locale={typedLocale}
        items={data.education}
        t={{ education: t.education }}
      />
      <div className="section-divider" aria-hidden="true" />
      <HobbiesSection locale={typedLocale} items={data.hobbies} t={{ hobbies: t.hobbies }} />
      <div className="section-divider" aria-hidden="true" />
      <TestimonialsSection
        locale={typedLocale}
        items={data.testimonials}
        t={{ testimonials: t.testimonials, common: t.common }}
        settings={{
          honeypotEnabled: contactHoneypotEnabled,
          honeypotVisible: contactHoneypotVisible,
        }}
      />
      <ContactSection
        locale={typedLocale}
        t={{ contact: t.contact, common: t.common }}
        settings={{
          honeypotEnabled: contactHoneypotEnabled,
          honeypotVisible: contactHoneypotVisible,
        }}
      />
      <TerminalTrigger locale={typedLocale} data={data} />
    </>
  );
}
