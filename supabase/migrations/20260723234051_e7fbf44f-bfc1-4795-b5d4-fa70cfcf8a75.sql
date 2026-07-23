
CREATE POLICY "trip covers admin write" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'trip-covers' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "trip covers admin update" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'trip-covers' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "trip covers admin delete" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'trip-covers' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "trip covers auth read" ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'trip-covers');
