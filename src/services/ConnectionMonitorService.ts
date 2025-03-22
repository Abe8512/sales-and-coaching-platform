import { useState, useEffect, useCallback, useRef } from 'react';
import { checkSupabaseConnection } from '@/integrations/supabase/client';
import { useEventsStore } from '@/services/events';
import { errorHandler } from './ErrorHandlingService';

// Constants
const CONNECTION_CHECK_INTERVAL = 30000; // 30 seconds between connection checks
const STAGGERED_CHECK_DELAY = 5000; // 5 seconds staggered delay for initial check
const MAX_CONNECTION_CHECK_RETRIES = 3; // Maximum number of consecutive connection check retries
const CONNECTION_BACKOFF_MULTIPLIER = 2; // Exponential backoff multiplier for retries
const MAX_BACKOFF_INTERVAL = 300000; // Maximum backoff interval (5 minutes)

export const useConnectionStatus = () => {
  // Use errorHandler's isOffline state directly instead of duplicating it
  const [isConnected, setIsConnected] = useState<boolean>(!errorHandler.isOffline);
  const [lastChecked, setLastChecked] = useState<number | null>(null);
  const [isCheckingConnection, setIsCheckingConnection] = useState<boolean>(false);
  const [retryBackoff, setRetryBackoff] = useState<number>(CONNECTION_CHECK_INTERVAL);
  const dispatchEvent = useEventsStore.getState().dispatchEvent;
  const isFirstRender = useRef(true);
  const checkIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const retryCountRef = useRef<number>(0);
  const backoffTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // Use a ref to store event handlers to avoid recreating them on each render
  const eventHandlersRef = useRef({
    handleOnline: () => {
      console.log('Browser reports online status');
      // Reset retry count and backoff when browser reports online
      retryCountRef.current = 0;
      setRetryBackoff(CONNECTION_CHECK_INTERVAL);
      
      // Instead of directly setting isConnected, trigger a connection check
      // This ensures we actually verify the Supabase connection
      checkConnection().then(connected => {
        if (connected) {
          errorHandler.setOffline(false);
          setIsConnected(true);
          dispatchEvent('connection-restored');
        }
      });
      
      setLastChecked(Date.now());
    },
    handleOffline: () => {
      console.log('Browser reports offline status');
      // Instead of directly setting isConnected, let errorHandler manage the state
      errorHandler.setOffline(true);
      setIsConnected(false);
      setLastChecked(Date.now());
      dispatchEvent('connection-lost');
    },
    handleSupabaseConnectionRestored: () => {
      console.log('Supabase connection restored');
      retryCountRef.current = 0;
      setRetryBackoff(CONNECTION_CHECK_INTERVAL);
      setIsConnected(true);
      setLastChecked(Date.now());
      dispatchEvent('connection-restored');
    },
    handleSupabaseConnectionLost: () => {
      console.log('Supabase connection lost');
      setIsConnected(false);
      setLastChecked(Date.now());
      dispatchEvent('connection-lost');
    }
  });
  
  // Check connection with retry limits to prevent infinite loops
  const checkConnection = useCallback(async () => {
    if (isCheckingConnection) return isConnected;
    
    setIsCheckingConnection(true);
    
    try {
      const connected = await checkSupabaseConnection();
      
      // Reset retry counter on success
      if (connected) {
        retryCountRef.current = 0;
        setRetryBackoff(CONNECTION_CHECK_INTERVAL);
        
        // Clear any pending backoff timeout
        if (backoffTimeoutRef.current) {
          clearTimeout(backoffTimeoutRef.current);
          backoffTimeoutRef.current = null;
        }
      } else {
        // Increment retry counter on failure and apply exponential backoff
        retryCountRef.current++;
        const newBackoff = Math.min(
          retryBackoff * CONNECTION_BACKOFF_MULTIPLIER,
          MAX_BACKOFF_INTERVAL
        );
        setRetryBackoff(newBackoff);
        
        console.warn(`Connection check failed (attempt ${retryCountRef.current}), next retry in ${newBackoff/1000}s`);
        
        // Show a non-disruptive notification for persistent connection issues
        if (retryCountRef.current > 2) {
          dispatchEvent('connection-unstable', {
            retryCount: retryCountRef.current,
            backoffTime: newBackoff
          });
        }
      }
      
      setIsConnected(connected);
      setLastChecked(Date.now());
      
      if (connected !== !errorHandler.isOffline) {
        // Sync our connection state with errorHandler to avoid inconsistencies
        errorHandler.setOffline(!connected);
      }
      
      return connected;
    } catch (error) {
      console.error('Error checking connection:', error);
      retryCountRef.current++;
      
      // Apply exponential backoff for retries
      const newBackoff = Math.min(
        retryBackoff * CONNECTION_BACKOFF_MULTIPLIER,
        MAX_BACKOFF_INTERVAL
      );
      setRetryBackoff(newBackoff);
      
      setIsConnected(false);
      errorHandler.setOffline(true);
      return false;
    } finally {
      setIsCheckingConnection(false);
    }
  }, [isCheckingConnection, retryBackoff, isConnected, dispatchEvent]);
  
  // Force a connection check with the option to reset backoff
  const forceConnectionCheck = useCallback(async (resetBackoff = true) => {
    if (resetBackoff) {
      retryCountRef.current = 0;
      setRetryBackoff(CONNECTION_CHECK_INTERVAL);
    }
    
    // Clear any pending backoff timeout
    if (backoffTimeoutRef.current) {
      clearTimeout(backoffTimeoutRef.current);
      backoffTimeoutRef.current = null;
    }
    
    return checkConnection();
  }, [checkConnection]);
  
  // Subscribe to error handler's connection status changes
  useEffect(() => {
    const unsubscribe = errorHandler.onConnectionChange((online) => {
      // Keep our local state in sync with errorHandler's state
      setIsConnected(online);
    });
    
    return unsubscribe;
  }, []);
  
  // Set up event listeners for connection changes
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const { handleOnline, handleOffline, handleSupabaseConnectionRestored, handleSupabaseConnectionLost } = eventHandlersRef.current;
    
    // Add browser online/offline event listeners
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Add Supabase connection event listeners
    window.addEventListener('supabase-connection-restored', handleSupabaseConnectionRestored);
    window.addEventListener('supabase-connection-lost', handleSupabaseConnectionLost);
    
    // Run initial connection check with a slight delay to avoid server load spikes
    const initialCheckTimeout = setTimeout(() => {
      checkConnection();
    }, isFirstRender.current ? STAGGERED_CHECK_DELAY : 0);
    
    isFirstRender.current = false;
    
    // Set up scheduled connection checks using backoff
    const scheduleNextCheck = () => {
      if (backoffTimeoutRef.current) {
        clearTimeout(backoffTimeoutRef.current);
      }
      
      backoffTimeoutRef.current = setTimeout(() => {
        checkConnection().finally(() => {
          scheduleNextCheck();
        });
      }, retryBackoff);
    };
    
    // Start the scheduling
    scheduleNextCheck();
    
    // Cleanup function
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('supabase-connection-restored', handleSupabaseConnectionRestored);
      window.removeEventListener('supabase-connection-lost', handleSupabaseConnectionLost);
      
      clearTimeout(initialCheckTimeout);
      
      if (backoffTimeoutRef.current) {
        clearTimeout(backoffTimeoutRef.current);
        backoffTimeoutRef.current = null;
      }
      
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
        checkIntervalRef.current = null;
      }
    };
  }, [checkConnection, retryBackoff]);
  
  return {
    isConnected,
    lastChecked,
    isCheckingConnection,
    checkConnection: forceConnectionCheck,
    retryCount: retryCountRef.current,
    retryBackoff
  };
};
