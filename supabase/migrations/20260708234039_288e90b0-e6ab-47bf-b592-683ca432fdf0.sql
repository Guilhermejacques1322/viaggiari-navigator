
CREATE TABLE public.trip_utilities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  kind text NOT NULL,
  name text NOT NULL,
  address text,
  maps_url text,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.trip_utilities TO authenticated;
GRANT ALL ON public.trip_utilities TO service_role;

ALTER TABLE public.trip_utilities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage trip_utilities"
  ON public.trip_utilities FOR ALL
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Clients view own trip_utilities"
  ON public.trip_utilities FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.trips t
    JOIN public.contacts c ON c.id = t.contact_id
    WHERE t.id = trip_utilities.trip_id
      AND t.visible_to_client = true
      AND c.user_id = auth.uid()
  ));

CREATE INDEX trip_utilities_trip_id_idx ON public.trip_utilities(trip_id);

CREATE TRIGGER trip_utilities_touch_updated_at
  BEFORE UPDATE ON public.trip_utilities
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
