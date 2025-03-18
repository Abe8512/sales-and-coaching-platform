
import { useState, useEffect } from 'react';
import { isConnected as checkSupabaseConnected } from '@/integrations/supabase/client';
import { useEventsStore } from '@/services/events';
import { errorHandler } from './ErrorHandlingService';

export const useConnectionStatus = () => {
  const [isConnected, setIsConnected] = useState<boolean>(checkSupabaseConnected());
  const [lastChecked, setLastChecked] = useState<number | null>(null);
  const dispatchEvent = useEventsStore.getState().dispatchEvent;

  useEffect(() => {
    // Initial connection check
    setIsConnected(checkSupabaseConnected());
    setLastChecked(Date.now());

    const handleOnline = () => {
      console.log('Browser reports online status');
      setIsConnected(true);
      setLastChecked(Date.now());
      dispatchEvent('connection-restored');
    };

    const handleOffline = () => {
      console.log('Browser reports offline status');
      setIsConnected(false);
      setLastChecked(Date.now());
      dispatchEvent('connection-lost');
    };

    const handleSupabaseConnectionRestored = () => {
      console.log('Supabase connection restored');
      setIsConnected(true);
      setLastChecked(Date.now());
      dispatchEvent('connection-restored');
    };

    const handleSupabaseConnectionLost = () => {
      console.log('Supabase connection lost');
      setIsConnected(false);
      setLastChecked(Date.now());
      dispatchEvent('connection-lost');
    };

    // Listen for browser online/offline events
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Listen for Supabase-specific connection events
    window.addEventListener('supabase-connection-restored', handleSupabaseConnectionRestored);
    window.addEventListener('supabase-connection-lost', handleSupabaseConnectionLost);

    // Subscribe to connection status changes from the error handler
    const unsubscribe = errorHandler.onConnectionChange((online) => {
      if (online !== isConnected) {
        setIsConnected(online);
        setLastChecked(Date.now());
        dispatchEvent(online ? 'connection-restored' : 'connection-lost');
      }
    });

    // Clean up event listeners
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('supabase-connection-restored', handleSupabaseConnectionRestored);
      window.removeEventListener('supabase-connection-lost', handleSupabaseConnectionLost);
      unsubscribe();
    };
  }, [dispatchEvent, isConnected]);

  return { isConnected, lastChecked };
};
