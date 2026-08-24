import React, { useEffect, useRef } from 'react';
import { loadYouTubeIframeAPI } from '../../lib/youtube';
import './AudioEngine.css';

/**
 * Universal AudioEngine
 * Seamlessly supports both direct audio streams (MP3/AAC from Supabase Storage / Cloud)
 * and YouTube embeds, with guaranteed 0:00 start on song change and zero spurious skipping.
 */
export function AudioEngine({
  currentSong,
  isPlaying,
  volume,
  isMuted,
  onPlayerReady,
  onStateChange,
  onError,
  onTimeUpdate
}) {
  const audioRef = useRef(null);
  const ytContainerRef = useRef(null);
  const ytPlayerRef = useRef(null);
  const isYtReadyRef = useRef(false);
  const lastLoadedAudioUrlRef = useRef(null);
  const lastLoadedYtIdRef = useRef(null);

  const isPlayingRef = useRef(isPlaying);
  isPlayingRef.current = isPlaying;

  const currentSongRef = useRef(currentSong);
  currentSongRef.current = currentSong;

  const isDirectAudio = Boolean(currentSong?.audio_url);

  // 1. Direct Cloud Audio Stream Handling (HTML5 Audio)
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isDirectAudio && currentSong?.audio_url) {
      // Pause YouTube player if running
      if (ytPlayerRef.current && isYtReadyRef.current) {
        try {
          ytPlayerRef.current.pauseVideo();
        } catch (e) {}
      }

      // Check if song changed
      if (lastLoadedAudioUrlRef.current !== currentSong.audio_url) {
        lastLoadedAudioUrlRef.current = currentSong.audio_url;
        audio.pause();
        audio.src = currentSong.audio_url;
        audio.currentTime = 0; // GUARANTEED START AT 0:00
        audio.load();
        if (onTimeUpdate) onTimeUpdate(0, 0);

        if (isPlaying) {
          audio.play().catch((err) => {
            console.warn('Audio auto-play waiting for user interaction/buffering:', err);
          });
        }
      } else {
        // Toggle play/pause on same song
        if (isPlaying && audio.paused) {
          audio.play().catch((err) => {
            console.warn('Audio play error:', err);
          });
        } else if (!isPlaying && !audio.paused) {
          audio.pause();
        }
      }

      audio.volume = isMuted ? 0 : volume / 100;
    } else {
      // Not direct audio, pause HTML5 element
      if (!audio.paused) {
        audio.pause();
      }
      lastLoadedAudioUrlRef.current = null;
    }
  }, [currentSong?.audio_url, isPlaying, isDirectAudio, volume, isMuted, onTimeUpdate]);

  // Handle HTML5 Volume / Mute
  useEffect(() => {
    if (audioRef.current && isDirectAudio) {
      audioRef.current.volume = isMuted ? 0 : volume / 100;
    }
  }, [volume, isMuted, isDirectAudio]);

  // 2. YouTube IFrame Player Handling (Only when no audio_url)
  useEffect(() => {
    let isCancelled = false;
    if (!ytContainerRef.current) return;

    ytContainerRef.current.innerHTML = '<div id="yt-player-slot"></div>';
    const mountSlot = ytContainerRef.current.querySelector('#yt-player-slot');

    loadYouTubeIframeAPI()
      .then((YT) => {
        if (isCancelled || !mountSlot) return;

        const initialVideoId = (!isDirectAudio && currentSongRef.current?.youtube_id) 
          ? currentSongRef.current.youtube_id 
          : 's5R83D4-8Yw';

        ytPlayerRef.current = new YT.Player(mountSlot, {
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
              isYtReadyRef.current = true;
              try {
                event.target.setVolume(volume);
                if (isMuted) event.target.mute();
                else event.target.unMute();

                if (isPlayingRef.current && !currentSongRef.current?.audio_url && currentSongRef.current?.youtube_id) {
                  event.target.playVideo();
                }
              } catch (e) {}

              if (onPlayerReady) onPlayerReady(event.target);
            },
            onStateChange: (event) => {
              if (isCancelled || currentSongRef.current?.audio_url) return;
              if (onStateChange) onStateChange(event.data, event.target);
            },
            onError: (event) => {
              // NEVER trigger errors if the current song has a direct cloud audio_url
              if (isCancelled || currentSongRef.current?.audio_url) return;
              console.warn('YouTube Player notice code:', event.data);
              if (onError) onError(event.data);
            }
          }
        });
      })
      .catch((err) => {
        console.warn('YouTube loader notice:', err);
      });

    return () => {
      isCancelled = true;
      if (ytPlayerRef.current && typeof ytPlayerRef.current.destroy === 'function') {
        try {
          ytPlayerRef.current.destroy();
        } catch (e) {}
        ytPlayerRef.current = null;
        isYtReadyRef.current = false;
      }
    };
  }, []);

  // Handle YouTube song change
  useEffect(() => {
    if (isDirectAudio || !ytPlayerRef.current || !isYtReadyRef.current || !currentSong?.youtube_id) return;

    if (lastLoadedYtIdRef.current !== currentSong.youtube_id) {
      lastLoadedYtIdRef.current = currentSong.youtube_id;
      if (onTimeUpdate) onTimeUpdate(0, 0);

      try {
        if (isPlaying) {
          ytPlayerRef.current.loadVideoById({
            videoId: currentSong.youtube_id,
            startSeconds: 0
          });
        } else {
          ytPlayerRef.current.cueVideoById({
            videoId: currentSong.youtube_id,
            startSeconds: 0
          });
        }
      } catch (err) {
        console.warn('Error changing YouTube track:', err);
      }
    }
  }, [currentSong?.youtube_id, isDirectAudio, isPlaying, onTimeUpdate]);

  // Handle YouTube play/pause toggle
  useEffect(() => {
    if (isDirectAudio || !ytPlayerRef.current || !isYtReadyRef.current) return;

    try {
      const state = ytPlayerRef.current.getPlayerState ? ytPlayerRef.current.getPlayerState() : -1;
      if (isPlaying && state !== 1 && state !== 3) {
        ytPlayerRef.current.playVideo();
      } else if (!isPlaying && state === 1) {
        ytPlayerRef.current.pauseVideo();
      }
    } catch (err) {}
  }, [isPlaying, isDirectAudio]);

  // 3. Smooth Progress Polling for Active Engine
  useEffect(() => {
    let interval = null;

    if (isPlaying) {
      interval = setInterval(() => {
        if (isDirectAudio && audioRef.current) {
          const curr = audioRef.current.currentTime || 0;
          const dur = audioRef.current.duration || 0;
          if (onTimeUpdate && !isNaN(curr)) {
            onTimeUpdate(curr, isNaN(dur) ? 0 : dur);
          }
        } else if (!isDirectAudio && ytPlayerRef.current && isYtReadyRef.current) {
          try {
            const curr = ytPlayerRef.current.getCurrentTime() || 0;
            const dur = ytPlayerRef.current.getDuration() || 0;
            if (onTimeUpdate) onTimeUpdate(curr, dur);
          } catch (e) {}
        }
      }, 350);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPlaying, isDirectAudio, onTimeUpdate]);

  return (
    <>
      {/* HTML5 Direct Audio Element */}
      <audio
        ref={audioRef}
        preload="auto"
        onLoadedMetadata={() => {
          if (isDirectAudio && audioRef.current && onTimeUpdate) {
            onTimeUpdate(0, audioRef.current.duration || 0);
          }
        }}
        onWaiting={() => {
          if (isDirectAudio && onStateChange) onStateChange(3); // 3 = buffering
        }}
        onCanPlay={() => {
          if (isDirectAudio && isPlaying && onStateChange) onStateChange(1); // 1 = playing
        }}
        onPlaying={() => {
          if (isDirectAudio && onStateChange) onStateChange(1); // 1 = playing
        }}
        onPause={() => {
          if (isDirectAudio && onStateChange) onStateChange(2); // 2 = paused
        }}
        onEnded={() => {
          if (isDirectAudio && onStateChange) onStateChange(0); // 0 = ended
        }}
        onError={(e) => {
          if (isDirectAudio && currentSong?.audio_url) {
            console.warn('Audio stream error on file:', currentSong.title, e);
          }
        }}
      />

      {/* YouTube Compliant Frame */}
      <div ref={ytContainerRef} className="yt-engine-container" aria-hidden="true" />
    </>
  );
}
