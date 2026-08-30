import { useState, useEffect } from 'react';

export function useClock() {
  const [clockData, setClockData] = useState({
    hours: '12',
    minutes: '00',
    ampm: 'AM'
  });

  useEffect(() => {
    function updateClock() {
      const now = new Date();
      let hours = now.getHours();
      const minutes = now.getMinutes();
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      hours = hours ? hours : 12; // '0' becomes '12'
      const minutesFormatted = minutes < 10 ? `0${minutes}` : String(minutes);
      
      setClockData({
        hours: String(hours),
        minutes: minutesFormatted,
        ampm
      });
    }

    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  return clockData;
}
