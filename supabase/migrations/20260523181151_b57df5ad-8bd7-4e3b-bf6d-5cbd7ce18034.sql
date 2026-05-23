CREATE TABLE public.trip_checklist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  position integer NOT NULL DEFAULT 0,
  completed boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.trip_checklist_items ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_trip_checklist_items_trip ON public.trip_checklist_items(trip_id, position);

CREATE POLICY "Admins manage trip_checklist_items"
ON public.trip_checklist_items FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Clients view own trip_checklist_items"
ON public.trip_checklist_items FOR SELECT
USING (EXISTS (
  SELECT 1 FROM trips t
  JOIN contacts c ON c.id = t.contact_id
  WHERE t.id = trip_checklist_items.trip_id
    AND t.visible_to_client = true
    AND c.user_id = auth.uid()
));

CREATE POLICY "Clients update own trip_checklist_items"
ON public.trip_checklist_items FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM trips t
  JOIN contacts c ON c.id = t.contact_id
  WHERE t.id = trip_checklist_items.trip_id
    AND t.visible_to_client = true
    AND c.user_id = auth.uid()
));

CREATE TRIGGER trg_trip_checklist_items_updated_at
BEFORE UPDATE ON public.trip_checklist_items
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();