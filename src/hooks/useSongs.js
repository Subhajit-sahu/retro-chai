import { useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { DEFAULT_SONGS, DEFAULT_EXTERNAL_LINKS } from '../config/site';

export function useSongs() {
  const [songs, setSongs] = useState(DEFAULT_SONGS);
  const [externalLinks, setExternalLinks] = useState(DEFAULT_EXTERNAL_LINKS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchSongsAndSettings = useCallback(async () => {
    if (!isSupabaseConfigured || !supabase) {
      setSongs(DEFAULT_SONGS);
      setExternalLinks(DEFAULT_EXTERNAL_LINKS);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Fetch active songs sorted by sort_order
      const { data: songData, error: songError } = await supabase
        .from('songs')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (songError) {
        console.warn('Error fetching songs from Supabase, using fallback:', songError.message);
        setSongs(DEFAULT_SONGS);
      } else if (songData && songData.length > 0) {
        setSongs(songData);
      } else {
        setSongs(DEFAULT_SONGS);
      }

      // Fetch site settings
      const { data: settingsData, error: settingsError } = await supabase
        .from('site_settings')
        .select('*');

      if (!settingsError && settingsData) {
        const links = { ...DEFAULT_EXTERNAL_LINKS };
        settingsData.forEach((row) => {
          if (row.key === 'spotify_url') links.spotify = row.value;
          if (row.key === 'youtube_music_url') links.youtubeMusic = row.value;
        });
        setExternalLinks(links);
      }
    } catch (err) {
      console.warn('Supabase fetch exception:', err);
      setError(err.message);
      setSongs(DEFAULT_SONGS);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSongsAndSettings();

    if (isSupabaseConfigured && supabase) {
      // Optional realtime listener for song/settings updates
      const channel = supabase
        .channel('public:songs_changes')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'songs' },
          () => {
            fetchSongsAndSettings();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [fetchSongsAndSettings]);

  return {
    songs,
    externalLinks,
    loading,
    error,
    refetch: fetchSongsAndSettings
  };
}
