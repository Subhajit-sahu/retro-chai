import React, { useState, useRef } from 'react';
import { formatTime } from '../../lib/youtube';
import './MusicPlayer.css';

export function MusicPlayer({
  player,
  totalSongsCount = 20,
  onOpenPlaylist,
  isPlaylistOpen
}) {
  const {
    currentSong,
    currentIndex,
    isPlaying,
    isBuffering,
    currentTime,
    duration,
    volume,
    isMuted,
    isShuffle,
    repeatMode,
    playerError,
    togglePlay,
    next,
    prev,
    seek,
    setVolume,
    toggleMute,
    toggleShuffle,
    toggleRepeat
  } = player;

  const [isSeeking, setIsSeeking] = useState(false);
  const [seekPreviewTime, setSeekPreviewTime] = useState(0);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const progressBarRef = useRef(null);

  const effectiveTime = isSeeking ? seekPreviewTime : currentTime;
  const progressPercent = duration > 0 ? (effectiveTime / duration) * 100 : 0;

  const handleSeekStart = (e) => {
    if (!duration || duration <= 0) return;
    setIsSeeking(true);
    updateSeekFromEvent(e);

    const handleMouseMove = (moveEvent) => {
      updateSeekFromEvent(moveEvent);
    };

    const handleMouseUp = (upEvent) => {
      setIsSeeking(false);
      const targetSec = getSecondsFromEvent(upEvent);
      seek(targetSec);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleMouseMove);
      window.removeEventListener('touchend', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('touchmove', handleMouseMove, { passive: false });
    window.addEventListener('touchend', handleMouseUp);
  };

  const getSecondsFromEvent = (e) => {
    if (!progressBarRef.current || !duration) return 0;
    const rect = progressBarRef.current.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clickX = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const ratio = clickX / rect.width;
    return ratio * duration;
  };

  const updateSeekFromEvent = (e) => {
    const sec = getSecondsFromEvent(e);
    setSeekPreviewTime(sec);
  };

  return (
    <div className="music-player-wrapper">
      {/* Player Error Banner */}
      {playerError && (
        <div className="player-error-badge" role="alert">
          {playerError}
        </div>
      )}

      {/* Floating Glass Capsule */}
      <div className="player-capsule">
        {/* Album Artwork with Spinning Vinyl Effect */}
        <div 
          className="player-art-container"
          onClick={onOpenPlaylist}
          title="Click to view full playlist"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onOpenPlaylist(); }}
          aria-label="View curated 20 songs playlist"
        >
          <div className={`vinyl-disc ${isPlaying ? 'playing' : 'paused'}`}>
            <img
              src={currentSong?.artwork_url || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&q=80'}
              alt={currentSong?.title ? `${currentSong.title} cover` : 'Album artwork'}
              className="vinyl-img"
              loading="lazy"
            />
          </div>
          <div className="vinyl-center-pin" />
        </div>

        {/* Track Info & Interactive Custom Progress Bar */}
        <div className="player-track-info">
          <div className="track-title-row">
            <p className="track-title" title={currentSong?.title}>
              {currentSong?.title || 'Chai Adda Radio'}
            </p>
            {currentSong?.year && (
              <span className="track-year">({currentSong.year})</span>
            )}
          </div>

          <p className="track-artist" title={currentSong?.artist}>
            {currentSong?.artist || 'Curated Classics'}
          </p>

          {/* Custom Seeker Bar */}
          <div className="player-seeker-container">
            <div
              ref={progressBarRef}
              className="custom-progress-bar"
              role="slider"
              aria-label="Track progress"
              aria-valuemin={0}
              aria-valuemax={Math.floor(duration)}
              aria-valuenow={Math.floor(effectiveTime)}
              onMouseDown={handleSeekStart}
              onTouchStart={handleSeekStart}
            >
              <div className="progress-bar-track">
                <div
                  className="progress-bar-fill"
                  style={{ width: `${Math.min(100, Math.max(0, progressPercent))}%` }}
                />
              </div>
              <div
                className="progress-thumb"
                style={{ left: `${Math.min(100, Math.max(0, progressPercent))}%` }}
              />
            </div>

            {/* Time Indicators */}
            <div className="time-row">
              <span className="time-text">
                {formatTime(effectiveTime)}
              </span>
              <span className="time-divider">/</span>
              <span className="time-text">
                {formatTime(duration)}
              </span>
            </div>
          </div>
        </div>

        {/* Player Controls */}
        <div className="player-controls-cluster">
          {/* Shuffle Toggle */}
          <button
            type="button"
            onClick={toggleShuffle}
            className={`control-btn secondary-btn ${isShuffle ? 'active-amber' : ''}`}
            aria-label="Toggle shuffle mode"
            title={isShuffle ? 'Shuffle enabled' : 'Shuffle disabled'}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="16 3 21 3 21 8"></polyline>
              <line x1="4" y1="20" x2="21" y2="3"></line>
              <polyline points="21 16 21 21 16 21"></polyline>
              <line x1="15" y1="15" x2="21" y2="21"></line>
              <line x1="4" y1="4" x2="9" y2="9"></line>
            </svg>
          </button>

          {/* Previous Track */}
          <button
            type="button"
            onClick={prev}
            className="control-btn prev-btn"
            aria-label="Previous track"
            title="Previous track"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
            </svg>
          </button>

          {/* Primary Play / Pause Button */}
          <button
            type="button"
            onClick={togglePlay}
            className="control-btn play-btn"
            aria-label={isPlaying ? 'Pause' : 'Play'}
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isBuffering ? (
              <div className="buffering-spinner" />
            ) : isPlaying ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
              </svg>
            ) : (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" style={{ marginLeft: '2px' }}>
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>

          {/* Next Track */}
          <button
            type="button"
            onClick={next}
            className="control-btn next-btn"
            aria-label="Next track"
            title="Next track"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M16 6h2v12h-2zm-2 6L5.5 6v12z" />
            </svg>
          </button>

          {/* Repeat Mode Toggle */}
          <button
            type="button"
            onClick={toggleRepeat}
            className={`control-btn secondary-btn ${repeatMode !== 'none' ? 'active-amber' : ''}`}
            aria-label={`Repeat mode: ${repeatMode}`}
            title={`Repeat mode: ${repeatMode}`}
          >
            {repeatMode === 'one' ? (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="17 1 21 5 17 9"></polyline>
                <path d="M3 11V9a4 4 0 0 1 4-4h14"></path>
                <polyline points="7 23 3 19 7 15"></polyline>
                <path d="M21 13v2a4 4 0 0 1-4 4H3"></path>
                <text x="10.5" y="14" fontSize="8" fill="currentColor" fontWeight="bold">1</text>
              </svg>
            ) : (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="17 1 21 5 17 9"></polyline>
                <path d="M3 11V9a4 4 0 0 1 4-4h14"></path>
                <polyline points="7 23 3 19 7 15"></polyline>
                <path d="M21 13v2a4 4 0 0 1-4 4H3"></path>
              </svg>
            )}
          </button>

          {/* Volume Trigger / Popover */}
          <div 
            className="volume-control-wrapper"
            onMouseEnter={() => setShowVolumeSlider(true)}
            onMouseLeave={() => setShowVolumeSlider(false)}
          >
            <button
              type="button"
              onClick={toggleMute}
              className="control-btn volume-btn"
              aria-label={isMuted ? 'Unmute' : 'Mute'}
              title={isMuted ? 'Unmute' : `Volume ${volume}%`}
            >
              {isMuted || volume === 0 ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                  <line x1="23" y1="9" x2="17" y2="15"></line>
                  <line x1="17" y1="9" x2="23" y2="15"></line>
                </svg>
              ) : volume < 50 ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                  <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                  <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                </svg>
              )}
            </button>

            {/* Floating Volume Slider */}
            {showVolumeSlider && (
              <div className="volume-slider-popover" role="dialog" aria-label="Volume adjustment">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={isMuted ? 0 : volume}
                  onChange={(e) => setVolume(Number(e.target.value))}
                  className="volume-range-input"
                  aria-label="Volume slider"
                />
              </div>
            )}
          </div>

          {/* Playlist Drawer Toggle Button */}
          <button
            type="button"
            onClick={onOpenPlaylist}
            className={`control-btn playlist-toggle-btn ${isPlaylistOpen ? 'active-amber' : ''}`}
            aria-label="Toggle playlist drawer"
            title="Curated 20 songs"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="8" y1="6" x2="21" y2="6"></line>
              <line x1="8" y1="12" x2="21" y2="12"></line>
              <line x1="8" y1="18" x2="21" y2="18"></line>
              <line x1="3" y1="6" x2="3.01" y2="6"></line>
              <line x1="3" y1="12" x2="3.01" y2="12"></line>
              <line x1="3" y1="18" x2="3.01" y2="18"></line>
            </svg>
            <span className="playlist-count-tag">{totalSongsCount}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
