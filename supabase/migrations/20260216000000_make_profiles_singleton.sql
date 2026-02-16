-- Convert profile storage from per-admin rows to a shared singleton row.

ALTER TABLE public.profiles
DROP CONSTRAINT IF EXISTS profiles_id_fkey;

ALTER TABLE public.profiles
DROP CONSTRAINT IF EXISTS profiles_singleton_id_check;

DO $$
DECLARE
  singleton_id UUID := '00000000-0000-0000-0000-000000000001';
  canonical_id UUID;
BEGIN
  SELECT id
  INTO canonical_id
  FROM public.profiles
  ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST, id DESC
  LIMIT 1;

  IF canonical_id IS NULL THEN
    RETURN;
  END IF;

  DELETE FROM public.profiles
  WHERE id <> canonical_id;

  IF canonical_id <> singleton_id THEN
    UPDATE public.profiles
    SET id = singleton_id,
        updated_at = NOW()
    WHERE id = canonical_id;
  END IF;
END
$$;

DROP INDEX IF EXISTS profiles_singleton_only_one_row_idx;

CREATE UNIQUE INDEX profiles_singleton_only_one_row_idx
ON public.profiles ((true));

ALTER TABLE public.profiles
ADD CONSTRAINT profiles_singleton_id_check
CHECK (id = '00000000-0000-0000-0000-000000000001'::UUID);
