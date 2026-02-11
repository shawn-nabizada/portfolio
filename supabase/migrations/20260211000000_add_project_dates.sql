alter table public.projects
  add column if not exists start_date date,
  add column if not exists end_date date,
  add column if not exists project_bullets_en text[] not null default '{}'::text[],
  add column if not exists project_bullets_fr text[] not null default '{}'::text[];

alter table public.education
  drop column if exists field_en,
  drop column if exists field_fr;
