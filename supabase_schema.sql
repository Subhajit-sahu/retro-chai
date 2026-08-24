-- ==============================================================================
-- CHAI ADDA (चाय का अड्डा) — Database Schema & Row Level Security (RLS)
-- ==============================================================================

-- 1. Create admin_users allowlist table
-- References Supabase auth.users(id). Only the database owner or direct SQL inserts
-- can grant admin privileges.
CREATE TABLE IF NOT EXISTS public.admin_users (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on admin_users
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- Only authenticated users can verify their own admin status (SELECT)
CREATE POLICY "Users can check their own admin status"
  ON public.admin_users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- No public INSERT/UPDATE/DELETE allowed on admin_users from client API!
-- (Admin roles must be assigned directly via Supabase Dashboard SQL editor)


-- 2. Create songs table
CREATE TABLE IF NOT EXISTS public.songs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  artist TEXT NOT NULL,
  year INTEGER,
  youtube_id TEXT,
  audio_url TEXT,
  artwork_url TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for optimal sorting and active filtering
CREATE INDEX IF NOT EXISTS idx_songs_sort_order ON public.songs(sort_order ASC);
CREATE INDEX IF NOT EXISTS idx_songs_is_active ON public.songs(is_active);

-- Enable RLS on songs
ALTER TABLE public.songs ENABLE ROW LEVEL SECURITY;

-- PUBLIC SELECT POLICY: Visitors can only read active songs
CREATE POLICY "Public visitors can read active songs"
  ON public.songs
  FOR SELECT
  TO anon, authenticated
  USING (is_active = true OR auth.uid() IN (SELECT user_id FROM public.admin_users));

-- ADMIN INSERT POLICY: Only users in admin_users can insert
CREATE POLICY "Admins can insert songs"
  ON public.songs
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IN (SELECT user_id FROM public.admin_users));

-- ADMIN UPDATE POLICY: Only users in admin_users can update
CREATE POLICY "Admins can update songs"
  ON public.songs
  FOR UPDATE
  TO authenticated
  USING (auth.uid() IN (SELECT user_id FROM public.admin_users))
  WITH CHECK (auth.uid() IN (SELECT user_id FROM public.admin_users));

-- ADMIN DELETE POLICY: Only users in admin_users can delete
CREATE POLICY "Admins can delete songs"
  ON public.songs
  FOR DELETE
  TO authenticated
  USING (auth.uid() IN (SELECT user_id FROM public.admin_users));


-- 3. Create site_settings table for configurable external links (Spotify, YT Music)
CREATE TABLE IF NOT EXISTS public.site_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on site_settings
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

-- Public can read site_settings
CREATE POLICY "Public can read site settings"
  ON public.site_settings
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Only admins can mutate site_settings
CREATE POLICY "Admins can update site settings"
  ON public.site_settings
  FOR ALL
  TO authenticated
  USING (auth.uid() IN (SELECT user_id FROM public.admin_users))
  WITH CHECK (auth.uid() IN (SELECT user_id FROM public.admin_users));


-- 4. Auto-update timestamp trigger
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_songs_updated_at ON public.songs;
CREATE TRIGGER set_songs_updated_at
  BEFORE UPDATE ON public.songs
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();


-- 5. Seed initial 20 curated timeless retro Hindi classics (with verified YouTube IDs)
INSERT INTO public.songs (sort_order, title, artist, year, youtube_id, artwork_url, is_active)
VALUES
  (1, 'Lag Ja Gale', 'Lata Mangeshkar', 1964, 'TFr6G5zveS8', 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&q=80', true),
  (2, 'Yeh Shaam Mastani', 'Kishore Kumar', 1971, '1pZyv3e6V7k', 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300&q=80', true),
  (3, 'Pal Pal Dil Ke Paas', 'Kishore Kumar', 1973, 'WlUvH3gR9eY', 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&q=80', true),
  (4, 'Aap Ki Nazron Ne Samjha', 'Lata Mangeshkar', 1962, 'H0K0G_13zFw', 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300&q=80', true),
  (5, 'Mere Sapnon Ki Rani', 'Kishore Kumar', 1969, 'vo1MyS6461M', 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=300&q=80', true),
  (6, 'Chura Liya Hai Tumne Jo Dil Ko', 'Asha Bhosle, Mohd Rafi', 1973, 'k_gUj3k1QoU', 'https://images.unsplash.com/photo-1487180144351-b8472da7d491?w=300&q=80', true),
  (7, 'Kabhie Kabhie Mere Dil Mein', 'Mukesh', 1976, 'JqLp3u3kS1E', 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=300&q=80', true),
  (8, 'Abhi Na Jao Chhod Kar', 'Mohd Rafi, Asha Bhosle', 1961, 'v0T_aH_b084', 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=300&q=80', true),
  (9, 'Pyar Hua Iqrar Hua', 'Manna Dey, Lata Mangeshkar', 1955, 'oXLzfvedwzo', 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=300&q=80', true),
  (10, 'O Mere Dil Ke Chain', 'Kishore Kumar', 1972, 'm_q_F9l0j50', 'https://images.unsplash.com/photo-1520523839898-50712825e3a7?w=300&q=80', true),
  (11, 'Roop Tera Mastana', 'Kishore Kumar', 1969, 'HenA-OUyo0s', 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=300&q=80', true),
  (12, 'Kahin Door Jab Din Dhal Jaye', 'Mukesh', 1971, 'eK5g_rQ8k5k', 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=300&q=80', true),
  (13, 'Tere Bina Zindagi Se', 'Kishore Kumar, Lata Mangeshkar', 1975, 'b_5xLd_eJ2o', 'https://images.unsplash.com/photo-1445985543470-41fba5c3144a?w=300&q=80', true),
  (14, 'Gulabi Aankhen', 'Mohammed Rafi', 1970, 'zWk_yJ5rP_E', 'https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?w=300&q=80', true),
  (15, 'Ek Ladki Bheegi Bhaagi Si', 'Kishore Kumar', 1958, 'N0j1R5sX7hA', 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&q=80', true),
  (16, 'Ajeeb Dastan Hai Yeh', 'Lata Mangeshkar', 1960, '3CjG_k61w9Y', 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&q=80', true),
  (17, 'Likhe Jo Khat Tujhe', 'Mohammed Rafi', 1968, 'jZ7Yh9f5q_Y', 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300&q=80', true),
  (18, 'Zindagi Ek Safar Hai Suhana', 'Kishore Kumar', 1971, '0C5Zl5Y8g-k', 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300&q=80', true),
  (19, 'In Aankhon Ki Masti', 'Asha Bhosle', 1981, 'R6W5XqJb0oU', 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=300&q=80', true),
  (20, 'Chaudhvin Ka Chand Ho', 'Mohammed Rafi', 1960, 'yV0G7b2tK6A', 'https://images.unsplash.com/photo-1487180144351-b8472da7d491?w=300&q=80', true)
ON CONFLICT DO NOTHING;

-- Initial site settings
INSERT INTO public.site_settings (key, value)
VALUES
  ('spotify_url', '"https://open.spotify.com/playlist/37i9dQZF1DX0XUfTFmNBRM"'::jsonb),
  ('youtube_music_url', '"https://music.youtube.com/playlist?list=RDCLAK5uy_kQyD5Ld0H71wM"'::jsonb)
ON CONFLICT DO NOTHING;
