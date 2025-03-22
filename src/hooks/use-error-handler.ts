import { useState, useEffect, useCallback } from 'react';

type ConnectionChangeCallback = (isOnline: boolean) => void;

interface ErrorHandlerHook {
  isOffline: boolean;
  handleError: (error: Error | string | unknown) => void;
  clearError: () => void;
  onConnectionChange: (callback: ConnectionChangeCallback) => () => void;
}

/**
 * Hook for handling errors and connection status in the application
 */
export const useErrorHandler = (): ErrorHandlerHook => {
  const [lastError, setLastError] = useState<Error | null>(null);
  const [isOffline, setIsOffline] = useState<boolean>(false);
  const [connectionListeners, setConnectionListeners] = useState<ConnectionChangeCallback[]>([]);

  // Check network status on mount
  useEffect(() => {
    const setOnlineStatus = () => {
      const nextIsOffline = !navigator.onLine;
      setIsOffline(nextIsOffline);
      
      // Notify all listeners
      connectionListeners.forEach(listener => {
        listener(!nextIsOffline);
      });
    };

    // Set initial status
    setOnlineStatus();

    // Add event listeners
    window.addEventListener('online', setOnlineStatus);
    window.addEventListener('offline', setOnlineStatus);

    // Cleanup
    return () => {
      window.removeEventListener('online', setOnlineStatus);
      window.removeEventListener('offline', setOnlineStatus);
    };
  }, [connectionListeners]);

  /**
   * Register a callback to be notified when connection status changes
   */
  const onConnectionChange = useCallback((callback: ConnectionChangeCallback) => {
    setConnectionListeners(prev => [...prev, callback]);
    
    // Return unsubscribe function
    return () => {
      setConnectionListeners(prev => prev.filter(cb => cb !== callback));
    };
  }, []);

  /**
   * Handle errors consistently
   */
  const handleError = useCallback((error: Error | string | unknown) => {
    console.error('Error caught by error handler:', error);
    
    // Type guard for checking if an object has a message property
    const hasMessage = (obj: unknown): obj is { message: string } => {
      return typeof obj === 'object' && obj !== null && 'message' in obj && 
        typeof (obj as Record<string, unknown>).message === 'string';
    };
    
    // Type guard for checking if an object has a name property
    const hasName = (obj: unknown): obj is { name: string } => {
      return typeof obj === 'object' && obj !== null && 'name' in obj && 
        typeof (obj as Record<string, unknown>).name === 'string';
    };
    
    // Check if it's a network error
    if (hasMessage(error) && (
      error.message.includes('network') || 
      error.message.includes('connection')
    )) {
      setIsOffline(true);
    } else if (hasName(error) && error.name === 'NetworkError') {
      setIsOffline(true);
    } else if (!navigator.onLine) {
      setIsOffline(true);
    }
    
    setLastError(error instanceof Error ? error : new Error(String(error)));
  }, []);

  /**
   * Clear the current error
   */
  const clearError = useCallback(() => {
    setLastError(null);
  }, []);

  return {
    isOffline,
    handleError,
    clearError,
    onConnectionChange
  };
};

export default useErrorHandler; 