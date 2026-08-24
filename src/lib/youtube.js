// ==============================================================================
// YouTube IFrame Player API Loader Singleton
// ==============================================================================

let apiLoadingPromise = null;

export function loadYouTubeIframeAPI() {
  if (typeof window === 'undefined') return Promise.reject(new Error('Window not defined'));

  if (window.YT && window.YT.Player) {
    return Promise.resolve(window.YT);
  }

  if (apiLoadingPromise) {
    return apiLoadingPromise;
  }

  apiLoadingPromise = new Promise((resolve, reject) => {
    // Check if tag is already on the page
    const existingScript = document.querySelector('script[src="https://www.youtube.com/iframe_api"]');
    if (!existingScript) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      tag.async = true;
      tag.onerror = () => {
        apiLoadingPromise = null;
        reject(new Error('Failed to load YouTube IFrame API script'));
      };
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
    }

    const prevOnYouTubeIframeAPIReady = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (typeof prevOnYouTubeIframeAPIReady === 'function') {
        prevOnYouTubeIframeAPIReady();
      }
      resolve(window.YT);
    };

    // Safety timeout in case callback doesn't fire
    setTimeout(() => {
      if (window.YT && window.YT.Player) {
        resolve(window.YT);
      }
    }, 2500);
  });

  return apiLoadingPromise;
}

export function formatTime(seconds) {
  if (isNaN(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

export function sanitizeYouTubeId(input) {
  if (!input || typeof input !== 'string') return null;
  const trimmed = input.trim();
  // Standard 11-char YouTube ID or extracted from URL
  const match = trimmed.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
  if (match && match[1]) return match[1];
  if (/^[\w-]{11}$/.test(trimmed)) return trimmed;
  return null;
}
