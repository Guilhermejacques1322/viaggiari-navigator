
CREATE TABLE public.trip_utility_sections (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  title text not null,
  position int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.trip_utility_sections TO authenticated;
GRANT ALL ON public.trip_utility_sections TO service_role;

ALTER TABLE public.trip_utility_sections ENABLE ROW LEVEL SECURITY;

-- Admin can do everything
CREATE POLICY "Admins manage utility sections"
  ON public.trip_utility_sections FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Client can read their own trip's sections
CREATE POLICY "Clients read own trip utility sections"
  ON public.trip_utility_sections FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.trips t
    JOIN public.contacts c ON c.id = t.contact_id
    WHERE t.id = trip_utility_sections.trip_id
      AND c.user_id = auth.uid()
      AND t.visible_to_client = true
  ));

CREATE TRIGGER touch_trip_utility_sections
  BEFORE UPDATE ON public.trip_utility_sections
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER TABLE public.trip_utilities
  ADD COLUMN section_id uuid null references public.trip_utility_sections(id) on delete set null;

CREATE INDEX idx_trip_utilities_section ON public.trip_utilities(section_id);
CREATE INDEX idx_trip_utility_sections_trip ON public.trip_utility_sections(trip_id);
