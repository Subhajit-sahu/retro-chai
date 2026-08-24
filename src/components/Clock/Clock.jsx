import React from 'react';
import { useClock } from '../../hooks/useClock';
import './Clock.css';

export function Clock() {
  const time = useClock();

  return (
    <div className="ambient-clock" aria-label={`Current time: ${time}`}>
      <span className="clock-time">{time}</span>
    </div>
  );
}
