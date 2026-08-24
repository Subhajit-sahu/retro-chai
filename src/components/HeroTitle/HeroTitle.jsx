import React from 'react';
import { SITE_CONFIG } from '../../config/site';
import './HeroTitle.css';

export function HeroTitle() {
  return (
    <div className="hero-title-container" role="banner">
      {/* Grand Hindi Devanagari Title */}
      <h1 className="hero-hindi-title">
        {SITE_CONFIG.hindiTitle}
      </h1>

      {/* Sleek English Subtitle */}
      <h2 className="hero-english-title">
        {SITE_CONFIG.name}
      </h2>
    </div>
  );
}
