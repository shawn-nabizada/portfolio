-- ============================================
-- Portfolio schema baseline (squashed)
-- ============================================
-- Uses gen_random_uuid() instead of uuid_generate_v4() to avoid
-- extension search_path issues on hosted databases.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
AS $$
  SELECT COALESCE((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false);
$$;

GRANT EXECUTE ON FUNCTION public.is_admin() TO anon, authenticated, service_role;

-- Profiles (extends auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  headline_en TEXT,
  headline_fr TEXT,
  bio_en TEXT,
  bio_fr TEXT,
  location TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Skill Categories
CREATE TABLE public.skill_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name_en TEXT NOT NULL,
  name_fr TEXT NOT NULL,
  "order" INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Skills
CREATE TABLE public.skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name_en TEXT NOT NULL,
  name_fr TEXT NOT NULL,
  category_id UUID REFERENCES public.skill_categories(id) ON DELETE SET NULL,
  "order" INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ensure each skill has a unique order value.
-- Keep the earliest row for each duplicated order and move subsequent
-- duplicates to the end of the sequence.
WITH duplicate_rows AS (
  SELECT
    id,
    ROW_NUMBER() OVER (PARTITION BY "order" ORDER BY created_at ASC, id ASC) AS duplicate_rank
  FROM public.skills
),
needs_reorder AS (
  SELECT
    id,
    ROW_NUMBER() OVER (ORDER BY id ASC) AS reorder_offset
  FROM duplicate_rows
  WHERE duplicate_rank > 1
),
current_max AS (
  SELECT COALESCE(MAX("order"), -1) AS max_order
  FROM public.skills
)
UPDATE public.skills AS skills
SET "order" = current_max.max_order + needs_reorder.reorder_offset
FROM needs_reorder, current_max
WHERE skills.id = needs_reorder.id;

CREATE UNIQUE INDEX IF NOT EXISTS skills_order_unique
  ON public.skills ("order");

-- Projects
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title_en TEXT NOT NULL,
  title_fr TEXT NOT NULL,
  description_en TEXT,
  description_fr TEXT,
  image_url TEXT,
  project_url TEXT,
  github_url TEXT,
  featured BOOLEAN NOT NULL DEFAULT FALSE,
  "order" INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Project-Skills junction
CREATE TABLE public.project_skills (
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  skill_id UUID REFERENCES public.skills(id) ON DELETE CASCADE,
  PRIMARY KEY (project_id, skill_id)
);

-- Experience
CREATE TABLE public.experience (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company TEXT NOT NULL,
  position_en TEXT NOT NULL,
  position_fr TEXT NOT NULL,
  description_en TEXT,
  description_fr TEXT,
  location TEXT,
  start_date DATE NOT NULL,
  end_date DATE,
  "order" INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Education
CREATE TABLE public.education (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution TEXT NOT NULL,
  degree_en TEXT NOT NULL,
  degree_fr TEXT NOT NULL,
  field_en TEXT NOT NULL,
  field_fr TEXT NOT NULL,
  location TEXT,
  start_date DATE NOT NULL,
  end_date DATE,
  "order" INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Hobbies
CREATE TABLE public.hobbies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name_en TEXT NOT NULL,
  name_fr TEXT NOT NULL,
  icon TEXT,
  "order" INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Testimonials
CREATE TABLE public.testimonials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_name TEXT NOT NULL,
  author_title TEXT,
  author_company TEXT,
  content_en TEXT NOT NULL,
  content_fr TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Contact Messages
CREATE TABLE public.contact_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  subject TEXT,
  message TEXT NOT NULL,
  read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Resumes
CREATE TABLE public.resumes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  language TEXT NOT NULL CHECK (language IN ('en', 'fr')),
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Social Links
CREATE TABLE public.social_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform TEXT NOT NULL,
  url TEXT NOT NULL,
  icon TEXT,
  "order" INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Site Settings (key-value store)
CREATE TABLE public.site_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value JSONB NOT NULL DEFAULT '{}'::jsonb
);

-- Analytics Events
CREATE TABLE public.analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL CHECK (event_type IN ('portfolio_view', 'resume_download')),
  locale TEXT CHECK (locale IN ('en', 'fr')),
  path TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX analytics_events_event_type_created_at_idx
  ON public.analytics_events (event_type, created_at DESC);

CREATE INDEX analytics_events_created_at_idx
  ON public.analytics_events (created_at DESC);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skill_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.experience ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.education ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hobbies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.testimonials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resumes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

-- Public read policies
CREATE POLICY "Public read" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Public read" ON public.skill_categories FOR SELECT USING (true);
CREATE POLICY "Public read" ON public.skills FOR SELECT USING (true);
CREATE POLICY "Public read" ON public.projects FOR SELECT USING (true);
CREATE POLICY "Public read" ON public.project_skills FOR SELECT USING (true);
CREATE POLICY "Public read" ON public.experience FOR SELECT USING (true);
CREATE POLICY "Public read" ON public.education FOR SELECT USING (true);
CREATE POLICY "Public read" ON public.hobbies FOR SELECT USING (true);
CREATE POLICY "Public read" ON public.testimonials FOR SELECT USING (status = 'approved');
CREATE POLICY "Public read" ON public.resumes FOR SELECT USING (true);
CREATE POLICY "Public read" ON public.social_links FOR SELECT USING (true);
CREATE POLICY "Public read" ON public.site_settings FOR SELECT USING (true);

-- Private tables: no public read
CREATE POLICY "No public read" ON public.contact_messages FOR SELECT USING (false);
CREATE POLICY "No public read" ON public.analytics_events FOR SELECT USING (false);

-- Admin write policies
CREATE POLICY "Admin write" ON public.profiles
FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "Admin write" ON public.skill_categories
FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "Admin write" ON public.skills
FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "Admin write" ON public.projects
FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "Admin write" ON public.project_skills
FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "Admin write" ON public.experience
FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "Admin write" ON public.education
FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "Admin write" ON public.hobbies
FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "Admin write" ON public.testimonials
FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "Admin write" ON public.contact_messages
FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "Admin write" ON public.resumes
FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "Admin write" ON public.social_links
FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "Admin write" ON public.site_settings
FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "Admin write analytics" ON public.analytics_events
FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Public insert policies
CREATE POLICY "Public insert" ON public.contact_messages FOR INSERT WITH CHECK (true);
CREATE POLICY "Public insert" ON public.testimonials FOR INSERT WITH CHECK (true);

-- Admin read policies
CREATE POLICY "Admin read messages" ON public.contact_messages
FOR SELECT USING (public.is_admin());

CREATE POLICY "Admin read testimonials" ON public.testimonials
FOR SELECT USING (public.is_admin());

CREATE POLICY "Admin read analytics" ON public.analytics_events
FOR SELECT USING (public.is_admin());

-- Storage bucket for resumes
INSERT INTO storage.buckets (id, name, public)
VALUES ('resumes', 'resumes', true)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

DROP POLICY IF EXISTS "Public read resumes files" ON storage.objects;
CREATE POLICY "Public read resumes files" ON storage.objects
FOR SELECT USING (bucket_id = 'resumes');

DROP POLICY IF EXISTS "Admin write resumes files" ON storage.objects;
CREATE POLICY "Admin write resumes files" ON storage.objects
FOR ALL USING (bucket_id = 'resumes' AND public.is_admin())
WITH CHECK (bucket_id = 'resumes' AND public.is_admin());
