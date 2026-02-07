-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

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
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Skill Categories
CREATE TABLE public.skill_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name_en TEXT NOT NULL,
    name_fr TEXT NOT NULL,
    "order" INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Skills
CREATE TABLE public.skills (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name_en TEXT NOT NULL,
    name_fr TEXT NOT NULL,
    category_id UUID REFERENCES public.skill_categories(id) ON DELETE SET NULL,
    "order" INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Projects
CREATE TABLE public.projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title_en TEXT NOT NULL,
    title_fr TEXT NOT NULL,
    description_en TEXT,
    description_fr TEXT,
    image_url TEXT,
    project_url TEXT,
    github_url TEXT,
    featured BOOLEAN DEFAULT FALSE,
    "order" INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Project-Skills junction
CREATE TABLE public.project_skills (
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
    skill_id UUID REFERENCES public.skills(id) ON DELETE CASCADE,
    PRIMARY KEY (project_id, skill_id)
);

-- Experience
CREATE TABLE public.experience (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company TEXT NOT NULL,
    position_en TEXT NOT NULL,
    position_fr TEXT NOT NULL,
    description_en TEXT,
    description_fr TEXT,
    location TEXT,
    start_date DATE NOT NULL,
    end_date DATE,
    "order" INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Education
CREATE TABLE public.education (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    institution TEXT NOT NULL,
    degree_en TEXT NOT NULL,
    degree_fr TEXT NOT NULL,
    field_en TEXT NOT NULL,
    field_fr TEXT NOT NULL,
    location TEXT,
    start_date DATE NOT NULL,
    end_date DATE,
    "order" INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Hobbies
CREATE TABLE public.hobbies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name_en TEXT NOT NULL,
    name_fr TEXT NOT NULL,
    icon TEXT,
    "order" INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Testimonials
CREATE TABLE public.testimonials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    author_name TEXT NOT NULL,
    author_title TEXT,
    author_company TEXT,
    content_en TEXT NOT NULL,
    content_fr TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Contact Messages
CREATE TABLE public.contact_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    subject TEXT,
    message TEXT NOT NULL,
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Resumes
CREATE TABLE public.resumes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    language TEXT NOT NULL CHECK (language IN ('en', 'fr')),
    file_url TEXT NOT NULL,
    file_name TEXT NOT NULL,
    uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Social Links
CREATE TABLE public.social_links (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    platform TEXT NOT NULL,
    url TEXT NOT NULL,
    icon TEXT,
    "order" INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Site Settings (key-value store)
CREATE TABLE public.site_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key TEXT UNIQUE NOT NULL,
    value JSONB NOT NULL DEFAULT '{}'
);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

-- Enable RLS on all tables
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

-- Public read policies (anyone can read portfolio content)
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

-- Contact messages: NO public read (private inbox)
CREATE POLICY "No public read" ON public.contact_messages FOR SELECT USING (false);

-- Admin write policies (authenticated user can manage all content)
CREATE POLICY "Admin write" ON public.profiles FOR ALL USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "Admin write" ON public.skill_categories FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Admin write" ON public.skills FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Admin write" ON public.projects FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Admin write" ON public.project_skills FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Admin write" ON public.experience FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Admin write" ON public.education FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Admin write" ON public.hobbies FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Admin write" ON public.testimonials FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Admin write" ON public.contact_messages FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Admin write" ON public.resumes FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Admin write" ON public.social_links FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Admin write" ON public.site_settings FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- Public insert policies (visitors can submit contact messages and testimonials)
CREATE POLICY "Public insert" ON public.contact_messages FOR INSERT WITH CHECK (true);
CREATE POLICY "Public insert" ON public.testimonials FOR INSERT WITH CHECK (true);

-- Admin read for contact_messages (admin can read their inbox)
CREATE POLICY "Admin read messages" ON public.contact_messages FOR SELECT USING (auth.role() = 'authenticated');

-- Admin read all testimonials (including pending/rejected)
CREATE POLICY "Admin read testimonials" ON public.testimonials FOR SELECT USING (auth.role() = 'authenticated');
