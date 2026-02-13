import { getTranslations, locales, type Locale } from "@/lib/i18n";
import { getPortfolioData } from "@/lib/portfolio-data";
import type { Experience, Profile, SocialLink } from "@/lib/types/database";
import { localizedValue } from "@/lib/site-metadata";
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
import { getAdminLoginCommand } from "@/lib/config/admin-login-command";

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

function buildPersonJsonLd({
  locale,
  profile,
  settings,
  socialLinks,
  experience,
}: {
  locale: Locale;
  profile: Profile | null;
  settings: Record<string, unknown>;
  socialLinks: SocialLink[];
  experience: Experience[];
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

  const currentJob = experience.find((e) => !e.end_date);
  if (currentJob) {
    const jobTitle = locale === "fr" ? currentJob.position_fr : currentJob.position_en;
    if (jobTitle) personJsonLd.jobTitle = jobTitle;
    if (currentJob.company) {
      personJsonLd.worksFor = {
        "@type": "Organization",
        name: currentJob.company,
      };
    }
  }

  return personJsonLd;
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
  const adminLoginCommand = getAdminLoginCommand();
  const personJsonLd = buildPersonJsonLd({
    locale: typedLocale,
    profile: data.profile,
    settings: data.settings,
    socialLinks: data.socialLinks,
    experience: data.experience,
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
      <ProjectsSection locale={typedLocale} projects={data.projects} t={{ projects: t.projects }} />
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
      <TerminalTrigger
        locale={typedLocale}
        data={data}
        adminLoginCommand={adminLoginCommand}
      />
    </>
  );
}
