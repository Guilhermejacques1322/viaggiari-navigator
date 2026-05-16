
-- ===== ENUMS =====
CREATE TYPE public.app_role AS ENUM ('admin', 'client');
CREATE TYPE public.contact_status AS ENUM ('lead', 'negotiating', 'active_client', 'completed', 'inactive');
CREATE TYPE public.service_type AS ENUM ('package', 'assessoria', 'consultoria');
CREATE TYPE public.trip_status AS ENUM ('quote_sent', 'contract_signed', 'building', 'delivered', 'in_progress', 'completed');
CREATE TYPE public.activity_type AS ENUM ('passeio', 'refeicao', 'transporte', 'hospedagem', 'livre');
CREATE TYPE public.document_category AS ENUM ('flight', 'train', 'hotel', 'ticket', 'other');
CREATE TYPE public.payment_status AS ENUM ('pending', 'paid');
CREATE TYPE public.preroteiro_response AS ENUM ('want', 'skip');

-- ===== PROFILES =====
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ===== USER ROLES =====
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- ===== CONTACTS (CRM) =====
CREATE TABLE public.contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- if they have an account
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  destinations_of_interest TEXT[] DEFAULT '{}',
  service_interest public.service_type[] DEFAULT '{}',
  travel_period TEXT,
  status public.contact_status NOT NULL DEFAULT 'lead',
  source TEXT,
  internal_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

-- ===== LEADS (landing-page submissions, lightweight) =====
CREATE TABLE public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  destination TEXT,
  travel_period TEXT,
  service_interest TEXT[],
  message TEXT,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- ===== TRIPS =====
CREATE TABLE public.trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  service_type public.service_type NOT NULL,
  destinations TEXT[] DEFAULT '{}',
  start_date DATE,
  end_date DATE,
  total_value NUMERIC(10,2) DEFAULT 0,
  status public.trip_status NOT NULL DEFAULT 'quote_sent',
  is_international BOOLEAN DEFAULT false,
  visible_to_client BOOLEAN DEFAULT false,
  preroteiro_mode BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;

-- ===== ITINERARY DAYS =====
CREATE TABLE public.itinerary_days (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  day_number INTEGER NOT NULL,
  date DATE,
  title TEXT,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.itinerary_days ENABLE ROW LEVEL SECURITY;

-- ===== ITINERARY ACTIVITIES =====
CREATE TABLE public.itinerary_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  day_id UUID NOT NULL REFERENCES public.itinerary_days(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 0,
  time TIME,
  name TEXT NOT NULL,
  description TEXT,
  address TEXT,
  maps_url TEXT,
  activity_type public.activity_type DEFAULT 'passeio',
  has_ticket BOOLEAN DEFAULT false,
  document_id UUID,
  is_paid BOOLEAN DEFAULT false,
  in_preroteiro BOOLEAN DEFAULT true,
  client_response public.preroteiro_response,
  client_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.itinerary_activities ENABLE ROW LEVEL SECURITY;

-- ===== DOCUMENTS =====
CREATE TABLE public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category public.document_category NOT NULL DEFAULT 'other',
  storage_path TEXT NOT NULL,
  event_date TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- ===== NOTIFICATIONS =====
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  activity_id UUID REFERENCES public.itinerary_activities(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  body TEXT,
  scheduled_for TIMESTAMPTZ NOT NULL,
  sent BOOLEAN DEFAULT false,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- ===== REVIEWS =====
CREATE TABLE public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  activity_id UUID REFERENCES public.itinerary_activities(id) ON DELETE SET NULL,
  destination_activity_id UUID,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  location_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- ===== DESTINATIONS LIBRARY =====
CREATE TABLE public.destinations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  country TEXT,
  tags TEXT[] DEFAULT '{}',
  tips TEXT,
  cover_image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.destinations ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.destination_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  destination_id UUID NOT NULL REFERENCES public.destinations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  address TEXT,
  maps_url TEXT,
  activity_type public.activity_type DEFAULT 'passeio',
  avg_rating NUMERIC(3,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.destination_activities ENABLE ROW LEVEL SECURITY;

-- ===== QUOTES =====
CREATE TABLE public.quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  service_type public.service_type NOT NULL,
  destinations TEXT[] DEFAULT '{}',
  days INTEGER NOT NULL,
  daily_rate NUMERIC(10,2) NOT NULL,
  discount NUMERIC(10,2) DEFAULT 0,
  total NUMERIC(10,2) NOT NULL,
  notes TEXT,
  share_token TEXT UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;

-- ===== PAYMENTS =====
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  installment INTEGER NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  due_date DATE,
  paid_date DATE,
  status public.payment_status NOT NULL DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- ===== RLS POLICIES =====

-- profiles
CREATE POLICY "Users view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Admins view all profiles" ON public.profiles FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- user_roles
CREATE POLICY "Users view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins manage roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- contacts (admin-only)
CREATE POLICY "Admins manage contacts" ON public.contacts FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- leads: public insert (landing form), admin read
CREATE POLICY "Anyone submit lead" ON public.leads FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins view leads" ON public.leads FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update leads" ON public.leads FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete leads" ON public.leads FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- trips
CREATE POLICY "Admins manage trips" ON public.trips FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Clients view own trips" ON public.trips FOR SELECT USING (
  visible_to_client = true AND EXISTS (
    SELECT 1 FROM public.contacts c WHERE c.id = trips.contact_id AND c.user_id = auth.uid()
  )
);

-- itinerary_days
CREATE POLICY "Admins manage itinerary_days" ON public.itinerary_days FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Clients view own itinerary_days" ON public.itinerary_days FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.trips t JOIN public.contacts c ON c.id = t.contact_id
    WHERE t.id = itinerary_days.trip_id AND t.visible_to_client = true AND c.user_id = auth.uid()
  )
);

-- itinerary_activities
CREATE POLICY "Admins manage activities" ON public.itinerary_activities FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Clients view own activities" ON public.itinerary_activities FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.itinerary_days d JOIN public.trips t ON t.id = d.trip_id
    JOIN public.contacts c ON c.id = t.contact_id
    WHERE d.id = itinerary_activities.day_id AND t.visible_to_client = true AND c.user_id = auth.uid()
  )
);
CREATE POLICY "Clients update own response" ON public.itinerary_activities FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.itinerary_days d JOIN public.trips t ON t.id = d.trip_id
    JOIN public.contacts c ON c.id = t.contact_id
    WHERE d.id = itinerary_activities.day_id AND t.visible_to_client = true AND c.user_id = auth.uid()
  )
);

-- documents
CREATE POLICY "Admins manage documents" ON public.documents FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Clients view own documents" ON public.documents FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.trips t JOIN public.contacts c ON c.id = t.contact_id
    WHERE t.id = documents.trip_id AND t.visible_to_client = true AND c.user_id = auth.uid()
  )
);

-- notifications
CREATE POLICY "Admins manage notifications" ON public.notifications FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Clients view own notifications" ON public.notifications FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.trips t JOIN public.contacts c ON c.id = t.contact_id
    WHERE t.id = notifications.trip_id AND t.visible_to_client = true AND c.user_id = auth.uid()
  )
);

-- reviews
CREATE POLICY "Admins view reviews" ON public.reviews FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Clients insert own reviews" ON public.reviews FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.trips t JOIN public.contacts c ON c.id = t.contact_id
    WHERE t.id = reviews.trip_id AND c.user_id = auth.uid()
  )
);
CREATE POLICY "Clients view own reviews" ON public.reviews FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.trips t JOIN public.contacts c ON c.id = t.contact_id
    WHERE t.id = reviews.trip_id AND c.user_id = auth.uid()
  )
);

-- destinations (admins manage, everyone can read for library)
CREATE POLICY "Admins manage destinations" ON public.destinations FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Authenticated view destinations" ON public.destinations FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins manage destination_activities" ON public.destination_activities FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Authenticated view destination_activities" ON public.destination_activities FOR SELECT USING (auth.uid() IS NOT NULL);

-- quotes
CREATE POLICY "Admins manage quotes" ON public.quotes FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- payments
CREATE POLICY "Admins manage payments" ON public.payments FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Clients view own payments" ON public.payments FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.trips t JOIN public.contacts c ON c.id = t.contact_id
    WHERE t.id = payments.trip_id AND c.user_id = auth.uid()
  )
);

-- ===== TRIGGERS =====

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''), NEW.email);
  -- default role = client
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'client');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER touch_profiles BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER touch_contacts BEFORE UPDATE ON public.contacts FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER touch_trips BEFORE UPDATE ON public.trips FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ===== STORAGE =====
INSERT INTO storage.buckets (id, name, public) VALUES ('trip-documents', 'trip-documents', false);

CREATE POLICY "Admins manage trip docs" ON storage.objects FOR ALL
  USING (bucket_id = 'trip-documents' AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (bucket_id = 'trip-documents' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Clients read own trip docs" ON storage.objects FOR SELECT USING (
  bucket_id = 'trip-documents' AND EXISTS (
    SELECT 1 FROM public.documents d
    JOIN public.trips t ON t.id = d.trip_id
    JOIN public.contacts c ON c.id = t.contact_id
    WHERE d.storage_path = storage.objects.name AND c.user_id = auth.uid() AND t.visible_to_client = true
  )
);
