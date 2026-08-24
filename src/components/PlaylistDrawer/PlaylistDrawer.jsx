import React from 'react';
import './PlaylistDrawer.css';

export function PlaylistDrawer({
  isOpen,
  onClose,
  songs = [],
  currentSong,
  isPlaying,
  onSelectSong
}) {
  if (!isOpen) return null;

  return (
    <div className="playlist-drawer-backdrop" onClick={onClose}>
      <div 
        className="playlist-drawer-sheet" 
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Curated 20 Songs Playlist"
      >
        {/* Header */}
        <div className="drawer-header">
          <div className="drawer-header-left">
            <span className="drawer-subheading">चाय का अड्डा • RADIO</span>
            <h2 className="drawer-title">Curated 20 Classics</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="drawer-close-btn"
            aria-label="Close playlist drawer"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        {/* Songs List */}
        <div className="drawer-songs-list" role="list">
          {songs.map((song, idx) => {
            const isCurrent = currentSong?.id === song.id;
            const trackNum = (idx + 1 < 10 ? `0${idx + 1}` : `${idx + 1}`);

            return (
              <div
                key={song.id || idx}
                role="listitem"
                onClick={() => {
                  onSelectSong(song);
                  onClose();
                }}
                className={`drawer-song-item ${isCurrent ? 'is-active' : ''}`}
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    onSelectSong(song);
                    onClose();
                  }
                }}
                aria-label={`Play ${song.title} by ${song.artist}`}
              >
                {/* Track Index or Equalizer Wave */}
                <div className="song-idx-wrapper">
                  {isCurrent && isPlaying ? (
                    <div className="soundwave-equalizer" aria-label="Currently playing">
                      <span className="eq-bar eq-bar-1" />
                      <span className="eq-bar eq-bar-2" />
                      <span className="eq-bar eq-bar-3" />
                    </div>
                  ) : (
                    <span className="song-idx">{trackNum}</span>
                  )}
                </div>

                {/* Artwork Thumbnail */}
                <div className="song-thumb-wrapper">
                  <img
                    src={song.artwork_url || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&q=80'}
                    alt=""
                    className="song-thumb-img"
                    loading="lazy"
                  />
                </div>

                {/* Song Meta */}
                <div className="song-meta-wrapper">
                  <div className="song-title-row">
                    <span className="song-title">{song.title}</span>
                    {song.year && (
                      <span className="song-year">'{String(song.year).slice(-2)}</span>
                    )}
                  </div>
                  <span className="song-artist">{song.artist}</span>
                </div>

                {/* Play action indicator */}
                <div className="song-play-indicator">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer note */}
        <div className="drawer-footer">
          <p className="drawer-footer-text">
            Hand-curated retro collection for quiet late nights.
          </p>
        </div>
      </div>
    </div>
  );
}
