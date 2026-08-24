import React from 'react';
import { usePresence } from '../../hooks/usePresence';
import './LiveCounter.css';

export function LiveCounter() {
  const { listenerCount, isConnected, isConfigured } = usePresence();

  // If Supabase is configured and connected, show aggregate count. Otherwise show graceful fallback.
  const displayCount = isConfigured && isConnected && listenerCount !== null
    ? listenerCount
    : '—';

  return (
    <div
      className="live-counter-pill"
      aria-live="polite"
      aria-label={`${displayCount} people listening`}
    >
      <span className="live-pulse-dot-wrapper">
        <span className={`live-pulse-radar ${isConnected ? 'active' : 'idle'}`} />
        <span className={`live-pulse-dot ${isConnected ? 'active' : 'idle'}`} />
      </span>
      <span className="live-counter-number">{displayCount}</span>
      <span className="live-counter-label">listening</span>
    </div>
  );
}
