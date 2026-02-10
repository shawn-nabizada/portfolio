-- Storage bucket for profile avatars
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

DROP POLICY IF EXISTS "Public read avatar files" ON storage.objects;
CREATE POLICY "Public read avatar files" ON storage.objects
FOR SELECT USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Admin write avatar files" ON storage.objects;
CREATE POLICY "Admin write avatar files" ON storage.objects
FOR ALL USING (bucket_id = 'avatars' AND public.is_admin())
WITH CHECK (bucket_id = 'avatars' AND public.is_admin());
