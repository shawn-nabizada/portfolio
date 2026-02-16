import type {
  Education,
  Experience,
  Hobby,
  Profile,
  Resume,
  Skill,
  SkillCategory,
  SocialLink,
  Testimonial,
} from "@/lib/types/database";
import type { Locale } from "@/lib/i18n";
import { unstable_cache } from "next/cache";
import { createPublicServerClient } from "@/lib/supabase/public-server";
import { SHARED_PROFILE_ID } from "@/lib/constants/profile";

export interface LocalizedSkillCategory {
  id: string;
  name: string;
  order: number;
  skills: Array<{
    id: string;
    name: string;
    order: number;
  }>;
}

export interface LocalizedProject {
  id: string;
  title: string;
  description: string | null;
  bullets: string[];
  image_url: string | null;
  project_url: string | null;
  github_url: string | null;
  start_date: string | null;
  end_date: string | null;
  featured: boolean;
  order: number;
  skills: Array<{ id: string; name: string }>;
}

export interface PortfolioData {
  profile: Profile | null;
  skillsByCategory: LocalizedSkillCategory[];
  projects: LocalizedProject[];
  experience: Experience[];
  education: Education[];
  hobbies: Hobby[];
  testimonials: Testimonial[];
  socialLinks: SocialLink[];
  resumes: Resume[];
  settings: Record<string, unknown>;
}

const PORTFOLIO_CACHE_KEY = ["portfolio-public-data"];
const PORTFOLIO_CACHE_TAG = "portfolio-public";
const RETRY_DELAYS_MS = [150, 300] as const;

function throwIfQueryFailed(
  queryName: string,
  result: { error: { message: string } | null }
) {
  if (result.error) {
    throw new Error(`Failed to load ${queryName}: ${result.error.message}`);
  }
}

function localizeText(
  row: Record<string, unknown>,
  keyBase: string,
  locale: Locale
): string | null {
  const localized = row[`${keyBase}_${locale}`];
  if (typeof localized === "string") return localized;

  const fallback = row[`${keyBase}_en`];
  return typeof fallback === "string" ? fallback : null;
}

function normalizeTextArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}

function isTransientPortfolioError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();

  return [
    "fetch failed",
    "network",
    "timeout",
    "timed out",
    "econn",
    "eai_again",
    "enotfound",
    "too many requests",
    "service unavailable",
    "bad gateway",
    "gateway timeout",
    "429",
    "502",
    "503",
    "504",
  ].some((needle) => message.includes(needle));
}

async function fetchPortfolioData(locale: Locale): Promise<PortfolioData> {
  const supabase = createPublicServerClient();

  const [
    profileRes,
    categoriesRes,
    skillsRes,
    projectsRes,
    experienceRes,
    educationRes,
    hobbiesRes,
    testimonialsRes,
    socialLinksRes,
    resumesRes,
    settingsRes,
  ] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", SHARED_PROFILE_ID).maybeSingle(),
    supabase.from("skill_categories").select("*").order("order"),
    supabase.from("skills").select("*").order("order"),
    supabase
      .from("projects")
      .select("*, project_skills(skill_id, skills(*))")
      .order("order"),
    supabase.from("experience").select("*").order("order"),
    supabase.from("education").select("*").order("order"),
    supabase.from("hobbies").select("*").order("order"),
    supabase
      .from("testimonials")
      .select("*")
      .eq("status", "approved")
      .order("created_at", { ascending: false }),
    supabase.from("social_links").select("*").order("order"),
    supabase.from("resumes").select("*").order("uploaded_at", { ascending: false }),
    supabase.from("site_settings").select("*"),
  ]);

  throwIfQueryFailed("profiles", profileRes);
  throwIfQueryFailed("skill_categories", categoriesRes);
  throwIfQueryFailed("skills", skillsRes);
  throwIfQueryFailed("projects", projectsRes);
  throwIfQueryFailed("experience", experienceRes);
  throwIfQueryFailed("education", educationRes);
  throwIfQueryFailed("hobbies", hobbiesRes);
  throwIfQueryFailed("testimonials", testimonialsRes);
  throwIfQueryFailed("social_links", socialLinksRes);
  throwIfQueryFailed("resumes", resumesRes);
  throwIfQueryFailed("site_settings", settingsRes);

  let profile = (profileRes.data as Profile | null) ?? null;
  if (!profile) {
    const legacyProfileRes = await supabase
      .from("profiles")
      .select("*")
      .order("updated_at", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    throwIfQueryFailed("profiles (legacy fallback)", legacyProfileRes);

    if (legacyProfileRes.data) {
      console.warn(
        "[portfolio-data] Loaded legacy profile row. Run latest Supabase migrations to enable shared profile singleton."
      );
      profile = legacyProfileRes.data as Profile;
    }
  }

  const categories = (categoriesRes.data ?? []) as SkillCategory[];
  const skills = (skillsRes.data ?? []) as Skill[];

  const skillsByCategory: LocalizedSkillCategory[] = categories.map((category) => ({
    id: category.id,
    name: locale === "fr" ? category.name_fr : category.name_en,
    order: category.order,
    skills: skills
      .filter((skill) => skill.category_id === category.id)
      .sort((a, b) => a.order - b.order)
      .map((skill) => ({
        id: skill.id,
        name: locale === "fr" ? skill.name_fr : skill.name_en,
        order: skill.order,
      })),
  }));

  const uncategorizedSkills = skills
    .filter((skill) => !skill.category_id)
    .sort((a, b) => a.order - b.order)
    .map((skill) => ({
      id: skill.id,
      name: locale === "fr" ? skill.name_fr : skill.name_en,
      order: skill.order,
    }));

  if (uncategorizedSkills.length > 0) {
    skillsByCategory.push({
      id: "uncategorized",
      name: locale === "fr" ? "Autre" : "Other",
      order: 999,
      skills: uncategorizedSkills,
    });
  }

  const projects: LocalizedProject[] = ((projectsRes.data ?? []) as Record<string, unknown>[]).map(
    (project) => {
      const projectSkills = Array.isArray(project.project_skills)
        ? project.project_skills
        : [];

      const localizedSkills = projectSkills
        .map((entry) => {
          if (!entry || typeof entry !== "object") return null;
          const skill = (entry as { skills?: Record<string, unknown> | null }).skills;
          if (!skill) return null;

          const name =
            (locale === "fr" ? skill.name_fr : skill.name_en) ??
            skill.name_en ??
            skill.name_fr;

          if (typeof name !== "string") return null;

          return {
            id: String(skill.id),
            name,
          };
        })
        .filter((value): value is { id: string; name: string } => Boolean(value));

      const localizedBullets = normalizeTextArray(
        project[locale === "fr" ? "project_bullets_fr" : "project_bullets_en"]
      );
      const fallbackBullets = normalizeTextArray(
        project[locale === "fr" ? "project_bullets_en" : "project_bullets_fr"]
      );

      return {
        id: String(project.id),
        title: localizeText(project, "title", locale) || "",
        description: localizeText(project, "description", locale),
        bullets: localizedBullets.length > 0 ? localizedBullets : fallbackBullets,
        image_url:
          typeof project.image_url === "string" ? (project.image_url as string) : null,
        project_url:
          typeof project.project_url === "string"
            ? (project.project_url as string)
            : null,
        github_url:
          typeof project.github_url === "string" ? (project.github_url as string) : null,
        start_date:
          typeof project.start_date === "string"
            ? (project.start_date as string)
            : null,
        end_date:
          typeof project.end_date === "string" ? (project.end_date as string) : null,
        featured: Boolean(project.featured),
        order: Number(project.order ?? 0),
        skills: localizedSkills,
      };
    }
  );

  const settings: Record<string, unknown> = Object.fromEntries(
    ((settingsRes.data ?? []) as Array<{ key: string; value: unknown }>).map((entry) => [
      entry.key,
      entry.value,
    ])
  );

  const latestResumesByLanguage = new Map<string, Resume>();
  for (const resume of (resumesRes.data ?? []) as Resume[]) {
    if (!latestResumesByLanguage.has(resume.language)) {
      latestResumesByLanguage.set(resume.language, resume);
    }
  }

  return {
    profile,
    skillsByCategory,
    projects,
    experience: (experienceRes.data as Experience[]) ?? [],
    education: (educationRes.data as Education[]) ?? [],
    hobbies: (hobbiesRes.data as Hobby[]) ?? [],
    testimonials: (testimonialsRes.data as Testimonial[]) ?? [],
    socialLinks: (socialLinksRes.data as SocialLink[]) ?? [],
    resumes: Array.from(latestResumesByLanguage.values()),
    settings,
  };
}

const getCachedPortfolioData = unstable_cache(fetchPortfolioData, PORTFOLIO_CACHE_KEY, {
  tags: [PORTFOLIO_CACHE_TAG],
});

export async function getPortfolioData(locale: Locale): Promise<PortfolioData> {
  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    try {
      return await getCachedPortfolioData(locale);
    } catch (error) {
      const canRetry =
        attempt < RETRY_DELAYS_MS.length && isTransientPortfolioError(error);
      if (!canRetry) {
        throw error;
      }
      await sleep(RETRY_DELAYS_MS[attempt]);
    }
  }

  throw new Error("Failed to load portfolio data");
}
