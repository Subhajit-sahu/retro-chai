import { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { SITE_CONFIG } from '../config/site';

export function usePresence() {
  const [listenerCount, setListenerCount] = useState(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setListenerCount(null);
      setIsConnected(false);
      return;
    }

    let channel = null;

    try {
      channel = supabase.channel(SITE_CONFIG.presenceChannel, {
        config: {
          presence: {
            key: `guest_${Math.random().toString(36).substring(2, 9)}`
          }
        }
      });

      channel
        .on('presence', { event: 'sync' }, () => {
          const presenceState = channel.presenceState();
          // Count total unique presence keys
          const totalListeners = Object.keys(presenceState).length;
          setListenerCount(totalListeners > 0 ? totalListeners : 1);
        })
        .on('presence', { event: 'join' }, ({ newPresences }) => {
          const presenceState = channel.presenceState();
          const totalListeners = Object.keys(presenceState).length;
          setListenerCount(totalListeners > 0 ? totalListeners : 1);
        })
        .on('presence', { event: 'leave' }, ({ leftPresences }) => {
          const presenceState = channel.presenceState();
          const totalListeners = Object.keys(presenceState).length;
          setListenerCount(totalListeners > 0 ? totalListeners : 1);
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            setIsConnected(true);
            await channel.track({
              page: 'chai-adda',
              joinedAt: Date.now()
            });
          } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
            setIsConnected(false);
          }
        });
    } catch (err) {
      console.warn('Supabase presence error:', err);
      setIsConnected(false);
    }

    return () => {
      if (channel && supabase) {
        channel.untrack().catch(() => {});
        supabase.removeChannel(channel);
      }
    };
  }, []);

  return {
    listenerCount,
    isConnected,
    isConfigured: isSupabaseConfigured
  };
}
