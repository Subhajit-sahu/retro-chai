import React, { useEffect, useRef } from 'react';
import { loadYouTubeIframeAPI } from '../../lib/youtube';
import './YouTubeEngine.css';

/**
 * YouTubeEngine
 * Compliant YouTube embedded player container managing official YT.Player lifecycle.
 */
export function YouTubeEngine({
  currentSong,
  isPlaying,
  volume,
  isMuted,
  onPlayerReady,
  onStateChange,
  onError,
  onTimeUpdate
}) {
  const containerRef = useRef(null);
  const playerRef = useRef(null);
  const isReadyRef = useRef(false);
  const isPlayingRef = useRef(isPlaying);
  isPlayingRef.current = isPlaying;

  const currentSongRef = useRef(currentSong);
  currentSongRef.current = currentSong;

  const timeIntervalRef = useRef(null);

  // Initialize YT Player
  useEffect(() => {
    let isCancelled = false;

    if (!containerRef.current) return;

    // Reset container and create a dedicated mount slot for YT.Player
    containerRef.current.innerHTML = '<div id="yt-player-slot"></div>';
    const mountSlot = containerRef.current.querySelector('#yt-player-slot');

    loadYouTubeIframeAPI()
      .then((YT) => {
        if (isCancelled || !mountSlot) return;

        const initialVideoId = currentSongRef.current?.youtube_id || 's5R-t-yQd78';

        playerRef.current = new YT.Player(mountSlot, {
          height: '100%',
          width: '100%',
          videoId: initialVideoId,
          playerVars: {
            autoplay: 0,
            controls: 0,
            disablekb: 1,
            enablejsapi: 1,
            fs: 0,
            iv_load_policy: 3,
            modestbranding: 1,
            playsinline: 1,
            rel: 0
          },
          events: {
            onReady: (event) => {
              if (isCancelled) return;
              isReadyRef.current = true;
              try {
                event.target.setVolume(volume);
                if (isMuted) {
                  event.target.mute();
                } else {
                  event.target.unMute();
                }
                // If user clicked Play while API was initializing, begin playback immediately
                if (isPlayingRef.current) {
                  event.target.playVideo();
                }
              } catch (e) {}

              if (onPlayerReady) onPlayerReady(event.target);
            },
            onStateChange: (event) => {
              if (isCancelled) return;
              if (onStateChange) onStateChange(event.data, event.target);
            },
            onError: (event) => {
              if (isCancelled) return;
              console.warn('YouTube Player Error code:', event.data);
              if (onError) onError(event.data);
            }
          }
        });
      })
      .catch((err) => {
        console.warn('YouTube API loading failed:', err);
      });

    return () => {
      isCancelled = true;
      if (timeIntervalRef.current) {
        clearInterval(timeIntervalRef.current);
      }
      if (playerRef.current && typeof playerRef.current.destroy === 'function') {
        try {
          playerRef.current.destroy();
        } catch (e) {}
        playerRef.current = null;
        isReadyRef.current = false;
      }
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, []);

  // Handle Song Change
  useEffect(() => {
    if (!playerRef.current || !isReadyRef.current || !currentSong?.youtube_id) return;

    try {
      if (isPlaying) {
        playerRef.current.loadVideoById({
          videoId: currentSong.youtube_id,
          startSeconds: 0
        });
      } else {
        playerRef.current.cueVideoById({
          videoId: currentSong.youtube_id,
          startSeconds: 0
        });
      }
    } catch (err) {
      console.warn('Error loading video by ID:', err);
    }
  }, [currentSong?.youtube_id]);

  // Handle Play/Pause commands
  useEffect(() => {
    if (!playerRef.current || !isReadyRef.current) return;

    try {
      const state = playerRef.current.getPlayerState ? playerRef.current.getPlayerState() : -1;
      if (isPlaying && state !== 1 && state !== 3) {
        playerRef.current.playVideo();
      } else if (!isPlaying && state === 1) {
        playerRef.current.pauseVideo();
      }
    } catch (err) {
      console.warn('Error syncing playback state:', err);
    }
  }, [isPlaying]);

  // Handle Volume / Mute
  useEffect(() => {
    if (!playerRef.current || !isReadyRef.current) return;

    try {
      playerRef.current.setVolume(volume);
      if (isMuted) {
        playerRef.current.mute();
      } else {
        playerRef.current.unMute();
      }
    } catch (err) {}
  }, [volume, isMuted]);

  // Timer for duration & progress polling
  useEffect(() => {
    if (isPlaying) {
      timeIntervalRef.current = setInterval(() => {
        if (playerRef.current && isReadyRef.current && onTimeUpdate) {
          try {
            const current = playerRef.current.getCurrentTime() || 0;
            const dur = playerRef.current.getDuration() || 0;
            onTimeUpdate(current, dur);
          } catch (e) {}
        }
      }, 500);
    } else {
      if (timeIntervalRef.current) {
        clearInterval(timeIntervalRef.current);
      }
    }

    return () => {
      if (timeIntervalRef.current) {
        clearInterval(timeIntervalRef.current);
      }
    };
  }, [isPlaying, onTimeUpdate]);

  return (
    <div ref={containerRef} className="yt-engine-container" aria-hidden="true" />
  );
}
