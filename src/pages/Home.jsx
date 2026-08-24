import React, { useState, useEffect } from 'react';
import { AmbientBackground } from '../components/AmbientBackground/AmbientBackground';
import { Clock } from '../components/Clock/Clock';
import { LiveCounter } from '../components/LiveCounter/LiveCounter';
import { ExternalLinks } from '../components/ExternalLinks/ExternalLinks';
import { HeroTitle } from '../components/HeroTitle/HeroTitle';
import { MusicPlayer } from '../components/MusicPlayer/MusicPlayer';
import { PlaylistDrawer } from '../components/PlaylistDrawer/PlaylistDrawer';
import { AdminDashboard } from '../components/Admin/AdminDashboard';
import { AudioEngine } from '../components/AudioEngine/AudioEngine';
import { useSongs } from '../hooks/useSongs';
import { useMusicPlayer } from '../hooks/useMusicPlayer';

export function Home() {
  const { songs, externalLinks, refetch } = useSongs();
  const player = useMusicPlayer(songs);

  const [isPlaylistOpen, setIsPlaylistOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);

  // Check URL pathname or hash for direct /admin navigation
  useEffect(() => {
    const checkAdminRoute = () => {
      const path = window.location.pathname.toLowerCase();
      const hash = window.location.hash.toLowerCase();
      if (path === '/admin' || hash === '#admin') {
        setIsAdminOpen(true);
      }
    };

    checkAdminRoute();
    window.addEventListener('popstate', checkAdminRoute);
    window.addEventListener('hashchange', checkAdminRoute);
    return () => {
      window.removeEventListener('popstate', checkAdminRoute);
      window.removeEventListener('hashchange', checkAdminRoute);
    };
  }, []);

  const handleOpenAdmin = () => {
    setIsAdminOpen(true);
    window.history.pushState(null, '', '#admin');
  };

  const handleCloseAdmin = () => {
    setIsAdminOpen(false);
    if (window.location.hash === '#admin' || window.location.pathname === '/admin') {
      window.history.pushState(null, '', '/');
    }
  };

  return (
    <main className="chai-adda-main">
      {/* 1. Full-screen Cinematic Tapri Background */}
      <AmbientBackground />

      {/* 2. Top-left Ambient Clock */}
      <Clock />

      {/* 3. Top-center Supabase Live Listener Counter */}
      <LiveCounter />

      {/* 4. Top-right External Navigation Links (Spotify, YT Music, Admin) */}
      <ExternalLinks
        links={externalLinks}
        onOpenAdmin={handleOpenAdmin}
      />

      {/* 5. Center Real Devanagari & English Typography */}
      <HeroTitle />

      {/* 6. Floating Glass Music Player Capsule */}
      <MusicPlayer
        player={player}
        totalSongsCount={songs.length}
        onOpenPlaylist={() => setIsPlaylistOpen(true)}
        isPlaylistOpen={isPlaylistOpen}
      />

      {/* 7. Slide-over Curated 20 Tracks Playlist Drawer */}
      <PlaylistDrawer
        isOpen={isPlaylistOpen}
        onClose={() => setIsPlaylistOpen(false)}
        songs={songs}
        currentSong={player.currentSong}
        isPlaying={player.isPlaying}
        onSelectSong={player.selectSong}
      />

      {/* 8. Admin Management Modal / Page */}
      <AdminDashboard
        isOpen={isAdminOpen}
        onClose={handleCloseAdmin}
        onSongsUpdated={refetch}
      />

      {/* 9. Universal Audio Engine (Cloud Audio / MP3 + YouTube Embed) */}
      <AudioEngine
        currentSong={player.currentSong}
        isPlaying={player.isPlaying}
        volume={player.volume}
        isMuted={player.isMuted}
        onPlayerReady={player.onPlayerReady}
        onStateChange={player.onStateChange}
        onError={player.onError}
        onTimeUpdate={player.onTimeUpdate}
      />
    </main>
  );
}
