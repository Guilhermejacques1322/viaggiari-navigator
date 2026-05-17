CREATE POLICY "Clients view own contact"
ON public.contacts
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);