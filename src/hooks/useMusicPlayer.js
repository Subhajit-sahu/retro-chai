import { useState, useCallback, useRef, useEffect } from 'react';

export function useMusicPlayer(songs = []) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(80);
  const [isMuted, setIsMuted] = useState(false);
  const [isShuffle, setIsShuffle] = useState(false);
  const [repeatMode, setRepeatMode] = useState('all'); // 'none' | 'one' | 'all'
  const [playerError, setPlayerError] = useState(null);

  const playerInstanceRef = useRef(null);
  const songsRef = useRef(songs);
  songsRef.current = songs;

  const currentSong = songs[currentIndex] || songs[0] || null;

  // Make sure currentIndex stays valid if song list length changes
  useEffect(() => {
    if (songs.length > 0 && currentIndex >= songs.length) {
      setCurrentIndex(0);
    }
  }, [songs.length, currentIndex]);

  const onPlayerReady = useCallback((playerInstance) => {
    playerInstanceRef.current = playerInstance;
  }, []);

  const onTimeUpdate = useCallback((curr, dur) => {
    setCurrentTime(curr);
    if (dur && dur > 0) {
      setDuration(dur);
    }
  }, []);

  const play = useCallback(() => {
    setIsPlaying(true);
    setPlayerError(null);
  }, []);

  const pause = useCallback(() => {
    setIsPlaying(false);
  }, []);

  const togglePlay = useCallback(() => {
    setIsPlaying((prev) => !prev);
    setPlayerError(null);
  }, []);

  const selectSong = useCallback((songOrIndex) => {
    const list = songsRef.current;
    let targetIndex = 0;
    if (typeof songOrIndex === 'number') {
      targetIndex = Math.max(0, Math.min(songOrIndex, list.length - 1));
    } else if (songOrIndex && songOrIndex.id) {
      const idx = list.findIndex((s) => s.id === songOrIndex.id);
      if (idx !== -1) targetIndex = idx;
    }
    setCurrentIndex(targetIndex);
    setCurrentTime(0);
    setIsPlaying(true);
    setPlayerError(null);
  }, []);

  const next = useCallback(() => {
    const list = songsRef.current;
    if (!list || list.length === 0) return;

    if (isShuffle && list.length > 1) {
      let randIdx;
      do {
        randIdx = Math.floor(Math.random() * list.length);
      } while (randIdx === currentIndex);
      setCurrentIndex(randIdx);
    } else {
      setCurrentIndex((prev) => (prev + 1) % list.length);
    }
    setCurrentTime(0);
    setIsPlaying(true);
    setPlayerError(null);
  }, [currentIndex, isShuffle]);

  const prev = useCallback(() => {
    const list = songsRef.current;
    if (!list || list.length === 0) return;

    // If more than 3 seconds in, restart track
    if (currentTime > 3) {
      seek(0);
      return;
    }

    if (isShuffle && list.length > 1) {
      let randIdx;
      do {
        randIdx = Math.floor(Math.random() * list.length);
      } while (randIdx === currentIndex);
      setCurrentIndex(randIdx);
    } else {
      setCurrentIndex((prev) => (prev - 1 + list.length) % list.length);
    }
    setCurrentTime(0);
    setIsPlaying(true);
    setPlayerError(null);
  }, [currentTime, currentIndex, isShuffle]);

  const seek = useCallback((targetSeconds) => {
    setCurrentTime(targetSeconds);
    // 1. If HTML5 Audio element is active
    const audioEl = document.querySelector('audio');
    if (audioEl && audioEl.src) {
      try {
        audioEl.currentTime = targetSeconds;
      } catch (e) {}
    }
    // 2. If YouTube player is active
    if (playerInstanceRef.current && typeof playerInstanceRef.current.seekTo === 'function') {
      try {
        playerInstanceRef.current.seekTo(targetSeconds, true);
      } catch (e) {}
    }
  }, []);

  const handleVolumeChange = useCallback((newVol) => {
    const val = Math.max(0, Math.min(100, newVol));
    setVolume(val);
    if (val > 0 && isMuted) {
      setIsMuted(false);
    }
  }, [isMuted]);

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => !prev);
  }, []);

  const toggleShuffle = useCallback(() => {
    setIsShuffle((prev) => !prev);
  }, []);

  const toggleRepeat = useCallback(() => {
    setRepeatMode((prev) => {
      if (prev === 'all') return 'one';
      if (prev === 'one') return 'none';
      return 'all';
    });
  }, []);

  const onStateChange = useCallback((stateCode) => {
    // 0 = ENDED, 1 = PLAYING, 2 = PAUSED, 3 = BUFFERING, 5 = CUED
    if (stateCode === 1) {
      setIsPlaying(true);
      setIsBuffering(false);
      setPlayerError(null);
    } else if (stateCode === 2) {
      setIsBuffering(false);
    } else if (stateCode === 3) {
      setIsBuffering(true);
    } else if (stateCode === 0) {
      // Song ended
      if (repeatMode === 'one') {
        seek(0);
        setIsPlaying(true);
      } else if (repeatMode === 'all') {
        next();
      } else {
        // 'none'
        const list = songsRef.current;
        if (currentIndex < list.length - 1) {
          next();
        } else {
          setIsPlaying(false);
          seek(0);
        }
      }
    }
  }, [repeatMode, currentIndex, next, seek]);

  const onError = useCallback((errorCode) => {
    console.warn('Playback error encountered:', errorCode);
    setPlayerError(`Playback error (${errorCode}). Trying next track...`);
    setTimeout(() => {
      setPlayerError(null);
      next();
    }, 2500);
  }, [next]);

  return {
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
    play,
    pause,
    togglePlay,
    selectSong,
    next,
    prev,
    seek,
    setVolume: handleVolumeChange,
    toggleMute,
    toggleShuffle,
    toggleRepeat,
    onPlayerReady,
    onStateChange,
    onError,
    onTimeUpdate
  };
}
