
CREATE TYPE public.ig_media_type AS ENUM ('photo','video','carousel','reel');

CREATE TABLE public.instagram_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text NOT NULL UNIQUE,
  display_name text,
  bio text,
  profile_pic_url text,
  followers integer,
  posts_count integer,
  is_private boolean DEFAULT false,
  niche_note text,
  last_scraped_at timestamptz,
  last_ai_summary text,
  last_ai_summary_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.instagram_profiles TO authenticated;
GRANT ALL ON public.instagram_profiles TO service_role;
ALTER TABLE public.instagram_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage instagram_profiles" ON public.instagram_profiles
  FOR ALL USING (has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (has_role(auth.uid(),'admin'::app_role));

CREATE TRIGGER trg_ig_profiles_updated BEFORE UPDATE ON public.instagram_profiles
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.instagram_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.instagram_profiles(id) ON DELETE CASCADE,
  external_id text NOT NULL,
  posted_at timestamptz,
  media_type public.ig_media_type,
  caption text,
  thumbnail_url text,
  permalink text,
  likes integer DEFAULT 0,
  comments integer DEFAULT 0,
  hashtags text[] DEFAULT '{}'::text[],
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (profile_id, external_id)
);

CREATE INDEX idx_ig_posts_profile ON public.instagram_posts(profile_id, posted_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.instagram_posts TO authenticated;
GRANT ALL ON public.instagram_posts TO service_role;
ALTER TABLE public.instagram_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage instagram_posts" ON public.instagram_posts
  FOR ALL USING (has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (has_role(auth.uid(),'admin'::app_role));

CREATE TABLE public.instagram_ai_ideas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES public.instagram_profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text NOT NULL,
  suggested_media_type public.ig_media_type,
  suggested_networks text[] DEFAULT '{}'::text[],
  is_cross_trend boolean DEFAULT false,
  used_post_id uuid REFERENCES public.marketing_posts(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_ig_ideas_profile ON public.instagram_ai_ideas(profile_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.instagram_ai_ideas TO authenticated;
GRANT ALL ON public.instagram_ai_ideas TO service_role;
ALTER TABLE public.instagram_ai_ideas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage instagram_ai_ideas" ON public.instagram_ai_ideas
  FOR ALL USING (has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (has_role(auth.uid(),'admin'::app_role));
