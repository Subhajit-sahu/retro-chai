import { useState, useEffect } from 'react';

export function useClock() {
  const [timeString, setTimeString] = useState('');

  useEffect(() => {
    function updateClock() {
      const now = new Date();
      let hours = now.getHours();
      const minutes = now.getMinutes();
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      hours = hours ? hours : 12; // '0' becomes '12'
      const minutesFormatted = minutes < 10 ? `0${minutes}` : minutes;
      setTimeString(`${hours}:${minutesFormatted} ${ampm}`);
    }

    updateClock();
    // Sync to next full minute or run every second/minute
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  return timeString;
}
