export interface Profile {
  id: string;
  full_name: string | null;
  headline_en: string | null;
  headline_fr: string | null;
  bio_en: string | null;
  bio_fr: string | null;
  location: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface SkillCategory {
  id: string;
  name_en: string;
  name_fr: string;
  order: number;
  created_at: string;
}

export interface Skill {
  id: string;
  name_en: string;
  name_fr: string;
  category_id: string | null;
  order: number;
  created_at: string;
  category?: SkillCategory; // joined
}

export interface Project {
  id: string;
  title_en: string;
  title_fr: string;
  description_en: string | null;
  description_fr: string | null;
  project_bullets_en: string[];
  project_bullets_fr: string[];
  image_url: string | null;
  project_url: string | null;
  github_url: string | null;
  start_date: string | null;
  end_date: string | null;
  featured: boolean;
  order: number;
  created_at: string;
  skills?: Skill[]; // joined via project_skills
}

export interface ProjectSkill {
  project_id: string;
  skill_id: string;
}

export interface Experience {
  id: string;
  company: string;
  position_en: string;
  position_fr: string;
  description_en: string | null;
  description_fr: string | null;
  location: string | null;
  start_date: string;
  end_date: string | null;
  order: number;
  created_at: string;
}

export interface Education {
  id: string;
  institution: string;
  degree_en: string;
  degree_fr: string;
  location: string | null;
  start_date: string;
  end_date: string | null;
  order: number;
  created_at: string;
}

export interface Hobby {
  id: string;
  name_en: string;
  name_fr: string;
  short_description_en: string | null;
  short_description_fr: string | null;
  icon: string | null;
  order: number;
  created_at: string;
}

export interface Testimonial {
  id: string;
  author_name: string;
  author_title: string | null;
  author_company: string | null;
  content_en: string;
  content_fr: string | null;
  status: "pending" | "approved" | "rejected";
  created_at: string;
}

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  subject: string | null;
  message: string;
  read: boolean;
  created_at: string;
}

export interface Resume {
  id: string;
  language: "en" | "fr";
  file_url: string;
  file_name: string;
  uploaded_at: string;
}

export interface SocialLink {
  id: string;
  platform: string;
  url: string;
  icon: string | null;
  order: number;
  created_at: string;
}

export interface SiteSetting {
  id: string;
  key: string;
  value: Record<string, unknown>;
}

export interface AnalyticsEvent {
  id: string;
  event_type: "portfolio_view" | "resume_download";
  locale: "en" | "fr" | null;
  path: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}
