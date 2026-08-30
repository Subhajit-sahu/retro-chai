import React from 'react';
import { useClock } from '../../hooks/useClock';
import './Clock.css';

export function Clock() {
  const { hours, minutes, ampm } = useClock();

  return (
    <div className="ambient-clock" aria-label={`Current time: ${hours}:${minutes} ${ampm}`}>
      <span className="clock-time">
        <span>{hours}</span>
        <span className="clock-colon">:</span>
        <span>{minutes}</span>
        <span className="clock-ampm"> {ampm}</span>
      </span>
    </div>
  );
}
