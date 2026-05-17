-- 1. Fases de orçamento
CREATE TYPE quote_status AS ENUM ('sent','follow_up','lost','closed');
ALTER TABLE public.quotes
  ADD COLUMN status quote_status NOT NULL DEFAULT 'sent',
  ADD COLUMN lost_reason text,
  ADD COLUMN follow_up_at timestamptz,
  ADD COLUMN closed_at timestamptz;

-- 2. Vincular pagamentos a orçamento + método
ALTER TABLE public.payments
  ADD COLUMN quote_id uuid REFERENCES public.quotes(id) ON DELETE CASCADE,
  ADD COLUMN payment_method text;
ALTER TABLE public.payments ALTER COLUMN trip_id DROP NOT NULL;

-- 3. Custo por atividade do cliente (estimativa para o roteiro)
ALTER TABLE public.itinerary_activities
  ADD COLUMN estimated_cost numeric DEFAULT 0,
  ADD COLUMN currency text DEFAULT 'BRL';

-- 4. País/cidade na biblioteca de atividades
ALTER TABLE public.destination_activities
  ADD COLUMN country text,
  ADD COLUMN city text;

-- RLS: garantir que clientes vejam payments do próprio orçamento fechado também
-- (mantém policy existente por trip_id; adiciona via quote_id)
CREATE POLICY "Clients view own payments by quote"
ON public.payments FOR SELECT
USING (
  quote_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.quotes q
    JOIN public.contacts c ON c.id = q.contact_id
    WHERE q.id = payments.quote_id AND c.user_id = auth.uid()
  )
);