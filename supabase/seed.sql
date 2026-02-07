-- ===========================================
-- Seed data for development
-- ===========================================
-- NOTE: This does NOT create the admin user.
-- Use scripts/seed-admin.ts for that.
-- ===========================================

-- Fixed UUIDs for referential integrity
-- Skill Categories
-- cat_frontend:  a0000000-0000-0000-0000-000000000001
-- cat_backend:   a0000000-0000-0000-0000-000000000002
-- cat_database:  a0000000-0000-0000-0000-000000000003
-- cat_tools:     a0000000-0000-0000-0000-000000000004

-- Skills
-- skill_react:       b0000000-0000-0000-0000-000000000001
-- skill_nextjs:      b0000000-0000-0000-0000-000000000002
-- skill_typescript:  b0000000-0000-0000-0000-000000000003
-- skill_tailwind:    b0000000-0000-0000-0000-000000000004
-- skill_nodejs:      b0000000-0000-0000-0000-000000000005
-- skill_python:      b0000000-0000-0000-0000-000000000006
-- skill_postgresql:  b0000000-0000-0000-0000-000000000007
-- skill_supabase:    b0000000-0000-0000-0000-000000000008
-- skill_git:         b0000000-0000-0000-0000-000000000009
-- skill_docker:      b0000000-0000-0000-0000-00000000000a

-- Projects
-- proj_portfolio:    c0000000-0000-0000-0000-000000000001
-- proj_taskapp:      c0000000-0000-0000-0000-000000000002
-- proj_ecommerce:    c0000000-0000-0000-0000-000000000003
-- proj_weather:      c0000000-0000-0000-0000-000000000004

-- ============================================
-- Site Settings
-- ============================================

INSERT INTO public.site_settings (key, value) VALUES
    ('site_title', '{"en": "Alex Dupont | Full-Stack Developer", "fr": "Alex Dupont | Developpeur Full-Stack"}'::jsonb),
    ('site_description', '{"en": "Full-stack developer passionate about building modern web applications with great user experiences.", "fr": "Developpeur full-stack passionne par la creation d''applications web modernes offrant d''excellentes experiences utilisateur."}'::jsonb),
    ('hero_title', '{"en": "Hi, I''m Alex Dupont", "fr": "Bonjour, je suis Alex Dupont"}'::jsonb),
    ('hero_subtitle', '{"en": "I build modern web experiences that are fast, accessible, and beautiful.", "fr": "Je cree des experiences web modernes, rapides, accessibles et elegantes."}'::jsonb),
    ('contact_email', '{"value": "alex@example.com"}'::jsonb),
    ('footer_text', '{"en": "Designed & built by Alex Dupont", "fr": "Concu et realise par Alex Dupont"}'::jsonb);

-- ============================================
-- Skill Categories
-- ============================================

INSERT INTO public.skill_categories (id, name_en, name_fr, "order") VALUES
    ('a0000000-0000-0000-0000-000000000001', 'Frontend', 'Frontend', 1),
    ('a0000000-0000-0000-0000-000000000002', 'Backend', 'Backend', 2),
    ('a0000000-0000-0000-0000-000000000003', 'Database', 'Base de donnees', 3),
    ('a0000000-0000-0000-0000-000000000004', 'Tools & DevOps', 'Outils & DevOps', 4);

-- ============================================
-- Skills
-- ============================================

INSERT INTO public.skills (id, name_en, name_fr, category_id, "order") VALUES
    ('b0000000-0000-0000-0000-000000000001', 'React', 'React', 'a0000000-0000-0000-0000-000000000001', 1),
    ('b0000000-0000-0000-0000-000000000002', 'Next.js', 'Next.js', 'a0000000-0000-0000-0000-000000000001', 2),
    ('b0000000-0000-0000-0000-000000000003', 'TypeScript', 'TypeScript', 'a0000000-0000-0000-0000-000000000001', 3),
    ('b0000000-0000-0000-0000-000000000004', 'Tailwind CSS', 'Tailwind CSS', 'a0000000-0000-0000-0000-000000000001', 4),
    ('b0000000-0000-0000-0000-000000000005', 'Node.js', 'Node.js', 'a0000000-0000-0000-0000-000000000002', 1),
    ('b0000000-0000-0000-0000-000000000006', 'Python', 'Python', 'a0000000-0000-0000-0000-000000000002', 2),
    ('b0000000-0000-0000-0000-000000000007', 'PostgreSQL', 'PostgreSQL', 'a0000000-0000-0000-0000-000000000003', 1),
    ('b0000000-0000-0000-0000-000000000008', 'Supabase', 'Supabase', 'a0000000-0000-0000-0000-000000000003', 2),
    ('b0000000-0000-0000-0000-000000000009', 'Git', 'Git', 'a0000000-0000-0000-0000-000000000004', 1),
    ('b0000000-0000-0000-0000-00000000000a', 'Docker', 'Docker', 'a0000000-0000-0000-0000-000000000004', 2);

-- ============================================
-- Projects
-- ============================================

INSERT INTO public.projects (id, title_en, title_fr, description_en, description_fr, image_url, project_url, github_url, featured, "order") VALUES
    (
        'c0000000-0000-0000-0000-000000000001',
        'Personal Portfolio',
        'Portfolio Personnel',
        'A bilingual portfolio website built with Next.js, Supabase, and Tailwind CSS. Features a full admin dashboard for content management, dark mode support, and smooth animations.',
        'Un site portfolio bilingue construit avec Next.js, Supabase et Tailwind CSS. Comprend un tableau de bord d''administration complet pour la gestion du contenu, un mode sombre et des animations fluides.',
        '/images/projects/portfolio.png',
        'https://alexdupont.dev',
        'https://github.com/alexdupont/portfolio',
        TRUE,
        1
    ),
    (
        'c0000000-0000-0000-0000-000000000002',
        'TaskFlow',
        'TaskFlow',
        'A collaborative task management application with real-time updates, drag-and-drop boards, and team workspaces. Built with React, Node.js, and PostgreSQL.',
        'Une application collaborative de gestion de taches avec des mises a jour en temps reel, des tableaux glisser-deposer et des espaces de travail d''equipe. Construit avec React, Node.js et PostgreSQL.',
        '/images/projects/taskflow.png',
        'https://taskflow.example.com',
        'https://github.com/alexdupont/taskflow',
        TRUE,
        2
    ),
    (
        'c0000000-0000-0000-0000-000000000003',
        'ShopNow E-Commerce',
        'ShopNow E-Commerce',
        'A full-featured e-commerce platform with product search, shopping cart, Stripe payments, and an admin panel for inventory management.',
        'Une plateforme e-commerce complete avec recherche de produits, panier d''achat, paiements Stripe et un panneau d''administration pour la gestion des stocks.',
        '/images/projects/shopnow.png',
        'https://shopnow.example.com',
        'https://github.com/alexdupont/shopnow',
        TRUE,
        3
    ),
    (
        'c0000000-0000-0000-0000-000000000004',
        'Weather Dashboard',
        'Tableau de Bord Meteo',
        'A weather dashboard that displays current conditions and 7-day forecasts using the OpenWeatherMap API. Features location search, interactive charts, and responsive design.',
        'Un tableau de bord meteo affichant les conditions actuelles et les previsions sur 7 jours via l''API OpenWeatherMap. Comprend la recherche de localisation, des graphiques interactifs et un design adaptatif.',
        '/images/projects/weather.png',
        'https://weather.example.com',
        'https://github.com/alexdupont/weather-dashboard',
        FALSE,
        4
    );

-- ============================================
-- Project-Skills junction
-- ============================================

INSERT INTO public.project_skills (project_id, skill_id) VALUES
    -- Portfolio: React, Next.js, TypeScript, Tailwind CSS, Supabase
    ('c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001'),
    ('c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002'),
    ('c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000003'),
    ('c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000004'),
    ('c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000008'),
    -- TaskFlow: React, TypeScript, Node.js, PostgreSQL, Docker
    ('c0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001'),
    ('c0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000003'),
    ('c0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000005'),
    ('c0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000007'),
    ('c0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-00000000000a'),
    -- ShopNow: React, Next.js, TypeScript, Node.js, PostgreSQL
    ('c0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000001'),
    ('c0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000002'),
    ('c0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000003'),
    ('c0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000005'),
    ('c0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000007'),
    -- Weather Dashboard: React, TypeScript, Tailwind CSS
    ('c0000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000001'),
    ('c0000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000003'),
    ('c0000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000004');

-- ============================================
-- Experience
-- ============================================

INSERT INTO public.experience (company, position_en, position_fr, description_en, description_fr, location, start_date, end_date, "order") VALUES
    (
        'TechCorp Solutions',
        'Senior Full-Stack Developer',
        'Developpeur Full-Stack Senior',
        'Led the development of a SaaS platform serving 10,000+ users. Architected the frontend with React and Next.js, designed RESTful APIs with Node.js, and managed PostgreSQL databases. Mentored a team of 3 junior developers.',
        'Direction du developpement d''une plateforme SaaS servant plus de 10 000 utilisateurs. Architecture du frontend avec React et Next.js, conception d''API RESTful avec Node.js et gestion de bases de donnees PostgreSQL. Mentorat d''une equipe de 3 developpeurs juniors.',
        'Montreal, QC',
        '2023-03-01',
        NULL,
        1
    ),
    (
        'WebAgency Inc.',
        'Full-Stack Developer',
        'Developpeur Full-Stack',
        'Built responsive web applications for diverse clients in retail, healthcare, and finance. Implemented CI/CD pipelines with GitHub Actions and Docker. Improved page load times by 40% through performance optimization.',
        'Developpement d''applications web adaptatives pour divers clients dans les secteurs du commerce, de la sante et de la finance. Mise en place de pipelines CI/CD avec GitHub Actions et Docker. Amelioration des temps de chargement de 40 % grace a l''optimisation des performances.',
        'Quebec City, QC',
        '2020-06-15',
        '2023-02-28',
        2
    );

-- ============================================
-- Education
-- ============================================

INSERT INTO public.education (institution, degree_en, degree_fr, field_en, field_fr, location, start_date, end_date, "order") VALUES
    (
        'Universite Laval',
        'Bachelor of Science',
        'Baccalaureat en sciences',
        'Computer Science',
        'Informatique',
        'Quebec City, QC',
        '2016-09-01',
        '2020-05-15',
        1
    ),
    (
        'College de Maisonneuve',
        'Diploma of College Studies (DEC)',
        'Diplome d''etudes collegiales (DEC)',
        'Computer Science Technology',
        'Techniques de l''informatique',
        'Montreal, QC',
        '2014-09-01',
        '2016-06-15',
        2
    );

-- ============================================
-- Hobbies
-- ============================================

INSERT INTO public.hobbies (name_en, name_fr, icon, "order") VALUES
    ('Open Source Contributing', 'Contribution Open Source', 'code', 1),
    ('Photography', 'Photographie', 'camera', 2),
    ('Hiking', 'Randonnee', 'mountain', 3);

-- ============================================
-- Testimonials
-- ============================================

INSERT INTO public.testimonials (author_name, author_title, author_company, content_en, content_fr, status) VALUES
    (
        'Marie-Claire Tremblay',
        'Product Manager',
        'TechCorp Solutions',
        'Alex is an exceptional developer who consistently delivers high-quality work. Their attention to detail and ability to translate complex requirements into elegant solutions makes them a valuable team member.',
        'Alex est un developpeur exceptionnel qui livre constamment un travail de haute qualite. Son attention aux details et sa capacite a traduire des exigences complexes en solutions elegantes en font un membre precieux de l''equipe.',
        'approved'
    ),
    (
        'Jean-Philippe Roy',
        'CTO',
        'WebAgency Inc.',
        'Working with Alex was a fantastic experience. They brought fresh ideas to every project and had a deep understanding of both frontend and backend technologies. I would highly recommend them.',
        'Travailler avec Alex a ete une experience formidable. Il apportait des idees nouvelles a chaque projet et avait une comprehension approfondie des technologies frontend et backend. Je le recommande vivement.',
        'approved'
    ),
    (
        'Sarah Mitchell',
        'UX Designer',
        'Freelance',
        'Alex has a great eye for design implementation. They took my mockups and brought them to life with pixel-perfect accuracy and smooth animations. A pleasure to collaborate with.',
        'Alex a un excellent sens de l''implementation du design. Il a pris mes maquettes et les a rendues vivantes avec une precision au pixel pres et des animations fluides. Un plaisir de collaborer avec lui.',
        'pending'
    );

-- ============================================
-- Social Links
-- ============================================

INSERT INTO public.social_links (platform, url, icon, "order") VALUES
    ('GitHub', 'https://github.com/alexdupont', 'github', 1),
    ('LinkedIn', 'https://linkedin.com/in/alexdupont', 'linkedin', 2);

-- ============================================
-- Contact Messages (sample inbox)
-- ============================================

INSERT INTO public.contact_messages (name, email, subject, message, read) VALUES
    (
        'Sophie Leblanc',
        'sophie.leblanc@example.com',
        'Freelance project inquiry',
        'Hi Alex, I came across your portfolio and was impressed by your work. I have a project that I think would be a great fit for your skills. Would you be available for a quick call this week to discuss? Looking forward to hearing from you!',
        FALSE
    );
