ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS activity_id UUID REFERENCES public.itinerary_activities(id) ON DELETE SET NULL;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS day_id UUID REFERENCES public.itinerary_days(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_documents_activity_id ON public.documents(activity_id);
CREATE INDEX IF NOT EXISTS idx_documents_day_id ON public.documents(day_id);