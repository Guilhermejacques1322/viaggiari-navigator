-- Índices faltantes para acelerar as queries mais quentes do app.
-- Usamos IF NOT EXISTS por idempotência.

CREATE INDEX IF NOT EXISTS idx_trips_contact_id ON public.trips(contact_id);
CREATE INDEX IF NOT EXISTS idx_trips_visible_to_client ON public.trips(visible_to_client) WHERE visible_to_client = true;
CREATE INDEX IF NOT EXISTS idx_trips_start_date ON public.trips(start_date);

CREATE INDEX IF NOT EXISTS idx_itinerary_days_trip_id ON public.itinerary_days(trip_id);
CREATE INDEX IF NOT EXISTS idx_itinerary_activities_day_id ON public.itinerary_activities(day_id);

CREATE INDEX IF NOT EXISTS idx_documents_trip_id ON public.documents(trip_id);
CREATE INDEX IF NOT EXISTS idx_payments_trip_id ON public.payments(trip_id);
CREATE INDEX IF NOT EXISTS idx_payments_quote_id ON public.payments(quote_id);

CREATE INDEX IF NOT EXISTS idx_contacts_user_id ON public.contacts(user_id);
CREATE INDEX IF NOT EXISTS idx_quotes_contact_id ON public.quotes(contact_id);
CREATE INDEX IF NOT EXISTS idx_quotes_status_created_at ON public.quotes(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON public.leads(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_reviews_trip_id ON public.reviews(trip_id);
CREATE INDEX IF NOT EXISTS idx_destination_activities_destination_id ON public.destination_activities(destination_id);