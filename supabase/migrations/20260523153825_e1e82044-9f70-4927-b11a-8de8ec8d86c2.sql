
ALTER TABLE public.itinerary_activities
  ADD COLUMN IF NOT EXISTS image_url text,
  ADD COLUMN IF NOT EXISTS curiosities text;

-- Activity partners (operational)
CREATE TABLE IF NOT EXISTS public.activity_partners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id uuid NOT NULL REFERENCES public.itinerary_activities(id) ON DELETE CASCADE,
  name text NOT NULL,
  role text,
  cost numeric DEFAULT 0,
  currency text DEFAULT 'BRL',
  included_in_package boolean DEFAULT false,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_activity_partners_activity ON public.activity_partners(activity_id);

ALTER TABLE public.activity_partners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage activity_partners"
  ON public.activity_partners FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Clients view own activity_partners"
  ON public.activity_partners FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM itinerary_activities a
    JOIN itinerary_days d ON d.id = a.day_id
    JOIN trips t ON t.id = d.trip_id
    JOIN contacts c ON c.id = t.contact_id
    WHERE a.id = activity_partners.activity_id
      AND t.visible_to_client = true
      AND c.user_id = auth.uid()
  ));

-- Partner products (global showcase)
CREATE TABLE IF NOT EXISTS public.partner_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_name text NOT NULL,
  product_name text NOT NULL,
  purchase_url text NOT NULL,
  image_url text,
  description text,
  category text,
  display_order int DEFAULT 0,
  active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.partner_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage partner_products"
  ON public.partner_products FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated view active partner_products"
  ON public.partner_products FOR SELECT
  USING (auth.uid() IS NOT NULL AND active = true);

CREATE TRIGGER partner_products_touch_updated
  BEFORE UPDATE ON public.partner_products
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
