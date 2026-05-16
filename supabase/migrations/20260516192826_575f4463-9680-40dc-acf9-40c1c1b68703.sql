-- Allow anonymous lead submissions into contacts
CREATE POLICY "Anyone submit lead contact"
ON public.contacts
FOR INSERT
TO anon, authenticated
WITH CHECK (
  status = 'lead'
  AND user_id IS NULL
  AND internal_notes IS NULL
);