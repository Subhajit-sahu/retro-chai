import React from 'react';
import bgImage from '../../assets/background.png';
import './AmbientBackground.css';

export function AmbientBackground() {
  return (
    <div className="ambient-bg-wrapper" aria-hidden="true">
      {/* Background artwork */}
      <img
        src={bgImage}
        alt="Chai Adda tapri background artwork"
        className="ambient-bg-image"
        fetchPriority="high"
        decoding="async"
      />

      {/* Cinematic Vignette & Warm Overlays */}
      <div className="ambient-overlay-vignette" />
      <div className="ambient-overlay-bottom" />
      <div className="ambient-overlay-amber-glow" />
    </div>
  );
}
