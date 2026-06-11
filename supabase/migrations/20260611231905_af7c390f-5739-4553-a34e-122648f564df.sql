
-- Enum para modos de transporte
CREATE TYPE public.transport_mode AS ENUM ('driving', 'transit', 'walking', 'hidden');

-- Preferência por trecho (na atividade de origem)
ALTER TABLE public.itinerary_activities
  ADD COLUMN transport_mode_to_next public.transport_mode;

-- Preferência padrão da viagem
ALTER TABLE public.trips
  ADD COLUMN default_transport_mode public.transport_mode NOT NULL DEFAULT 'driving';

-- Cache de rotas entre dois pontos
CREATE TABLE public.activity_routes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_activity_id uuid NOT NULL REFERENCES public.itinerary_activities(id) ON DELETE CASCADE,
  to_activity_id uuid NOT NULL REFERENCES public.itinerary_activities(id) ON DELETE CASCADE,
  driving_duration_sec integer,
  driving_distance_m integer,
  transit_duration_sec integer,
  transit_distance_m integer,
  transit_is_estimate boolean NOT NULL DEFAULT true,
  walking_duration_sec integer,
  walking_distance_m integer,
  computed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (from_activity_id, to_activity_id)
);

CREATE INDEX idx_activity_routes_from ON public.activity_routes(from_activity_id);
CREATE INDEX idx_activity_routes_to ON public.activity_routes(to_activity_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.activity_routes TO authenticated;
GRANT ALL ON public.activity_routes TO service_role;

ALTER TABLE public.activity_routes ENABLE ROW LEVEL SECURITY;

-- Admins gerenciam tudo
CREATE POLICY "Admins manage routes"
  ON public.activity_routes
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Clientes podem ler rotas das suas próprias viagens (visíveis)
CREATE POLICY "Clients read own trip routes"
  ON public.activity_routes
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.itinerary_activities a
      JOIN public.itinerary_days d ON d.id = a.day_id
      JOIN public.trips t ON t.id = d.trip_id
      JOIN public.contacts c ON c.id = t.contact_id
      WHERE a.id = activity_routes.from_activity_id
        AND c.user_id = auth.uid()
        AND t.visible_to_client = true
    )
  );

CREATE TRIGGER touch_activity_routes_updated_at
  BEFORE UPDATE ON public.activity_routes
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
