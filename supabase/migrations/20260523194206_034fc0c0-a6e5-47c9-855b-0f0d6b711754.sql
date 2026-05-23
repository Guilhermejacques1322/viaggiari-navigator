
CREATE TYPE public.marketing_media_type AS ENUM ('photo', 'video');
CREATE TYPE public.marketing_post_status AS ENUM ('scheduled', 'done');

CREATE TABLE public.marketing_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  media_type public.marketing_media_type NOT NULL DEFAULT 'photo',
  media_url text,
  media_notes text,
  caption text,
  networks text[] NOT NULL DEFAULT '{}',
  publish_at timestamptz NOT NULL,
  status public.marketing_post_status NOT NULL DEFAULT 'scheduled',
  done_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_marketing_posts_publish_at ON public.marketing_posts(publish_at);

ALTER TABLE public.marketing_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage marketing_posts"
  ON public.marketing_posts
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_marketing_posts_updated_at
  BEFORE UPDATE ON public.marketing_posts
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
