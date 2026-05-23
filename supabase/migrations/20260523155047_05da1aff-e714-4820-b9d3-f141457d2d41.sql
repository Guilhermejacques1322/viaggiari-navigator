CREATE TABLE public.operational_partners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  role text,
  default_cost numeric DEFAULT 0,
  currency text DEFAULT 'BRL',
  contact text,
  country text,
  city text,
  notes text,
  active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.operational_partners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage operational_partners"
  ON public.operational_partners FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER operational_partners_touch_updated_at
  BEFORE UPDATE ON public.operational_partners
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER TABLE public.activity_partners
  ADD COLUMN IF NOT EXISTS partner_id uuid REFERENCES public.operational_partners(id) ON DELETE SET NULL;