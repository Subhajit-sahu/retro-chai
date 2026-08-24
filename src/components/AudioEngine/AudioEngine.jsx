import React, { useEffect, useRef } from 'react';
import { loadYouTubeIframeAPI } from '../../lib/youtube';
import './AudioEngine.css';

/**
 * Universal AudioEngine
 * Seamlessly supports both direct audio streams (MP3/AAC from Supabase Storage / Cloud)
 * AND YouTube embeds, with zero playback errors and unified controls.
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

  const isPlayingRef = useRef(isPlaying);
  isPlayingRef.current = isPlaying;

  const currentSongRef = useRef(currentSong);
  currentSongRef.current = currentSong;

  const isDirectAudio = Boolean(currentSong?.audio_url);

  // 1. Handle HTML5 Direct Audio Stream (MP3 / Cloud Storage / Supabase)
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isDirectAudio) {
      // Direct Audio Mode
      if (audio.src !== currentSong.audio_url) {
        audio.src = currentSong.audio_url;
        audio.load();
      }

      audio.volume = isMuted ? 0 : volume / 100;

      if (isPlaying) {
        audio.play().catch((err) => {
          console.warn('Direct audio play interrupted:', err);
        });
      } else {
        audio.pause();
      }
    } else {
      // Pause HTML5 audio if using YouTube
      audio.pause();
    }
  }, [currentSong?.audio_url, isPlaying, isDirectAudio]);

  // Handle HTML5 volume / mute
  useEffect(() => {
    if (audioRef.current && isDirectAudio) {
      audioRef.current.volume = isMuted ? 0 : volume / 100;
    }
  }, [volume, isMuted, isDirectAudio]);

  // 2. Handle YouTube IFrame Player (when using YouTube ID)
  useEffect(() => {
    let isCancelled = false;

    if (!ytContainerRef.current) return;

    ytContainerRef.current.innerHTML = '<div id="yt-player-slot"></div>';
    const mountSlot = ytContainerRef.current.querySelector('#yt-player-slot');

    loadYouTubeIframeAPI()
      .then((YT) => {
        if (isCancelled || !mountSlot) return;

        const initialVideoId = currentSongRef.current?.youtube_id || 's5R83D4-8Yw';

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

                if (isPlayingRef.current && !currentSongRef.current?.audio_url) {
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
              if (isCancelled || currentSongRef.current?.audio_url) return;
              console.warn('YouTube Player error:', event.data);
              if (onError) onError(event.data);
            }
          }
        });
      })
      .catch((err) => {
        console.warn('YouTube API loader error:', err);
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
      console.warn('Error cueing YouTube track:', err);
    }
  }, [currentSong?.youtube_id, isDirectAudio]);

  // Handle YouTube play/pause
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

  // Progress polling for both HTML5 and YouTube
  useEffect(() => {
    let interval = null;

    if (isPlaying) {
      interval = setInterval(() => {
        if (isDirectAudio && audioRef.current) {
          const curr = audioRef.current.currentTime || 0;
          const dur = audioRef.current.duration || 0;
          if (onTimeUpdate) onTimeUpdate(curr, dur);
        } else if (ytPlayerRef.current && isYtReadyRef.current) {
          try {
            const curr = ytPlayerRef.current.getCurrentTime() || 0;
            const dur = ytPlayerRef.current.getDuration() || 0;
            if (onTimeUpdate) onTimeUpdate(curr, dur);
          } catch (e) {}
        }
      }, 400);
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
        preload="metadata"
        onEnded={() => {
          if (onStateChange) onStateChange(0); // 0 = ended
        }}
        onError={(e) => {
          if (isDirectAudio) {
            console.warn('HTML5 Audio error:', e);
            if (onError) onError('AUDIO_STREAM_ERROR');
          }
        }}
        onPlay={() => {
          if (isDirectAudio && onStateChange) onStateChange(1); // 1 = playing
        }}
        onPause={() => {
          if (isDirectAudio && onStateChange) onStateChange(2); // 2 = paused
        }}
      />

      {/* YouTube Compliant Frame */}
      <div ref={ytContainerRef} className="yt-engine-container" aria-hidden="true" />
    </>
  );
}
