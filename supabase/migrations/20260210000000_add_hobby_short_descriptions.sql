-- Add bilingual short descriptions for hobbies
ALTER TABLE public.hobbies
ADD COLUMN short_description_en TEXT,
ADD COLUMN short_description_fr TEXT;
