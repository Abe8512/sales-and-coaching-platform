
import { toast } from 'sonner';

export const connectionUtils = {
  /**
   * Show a connection status toast based on the current connection state
   */
  showConnectionStatus: (isConnected: boolean, wasConnected?: boolean) => {
    // Only show toasts when the state changes
    if (wasConnected === undefined || wasConnected !== isConnected) {
      if (isConnected) {
        toast.success('Connection restored', {
          description: 'You are now connected to the database. All changes will be saved.',
          duration: 4000,
        });
      } else {
        toast.error('Connection lost', {
          description: 'You are now working offline. Changes will be saved locally.',
          duration: 6000,
        });
      }
    }
    return isConnected;
  },

  /**
   * Delay execution to avoid UI jank during connection changes
   */
  debounceConnectionChange: (callback: () => void, delay = 1000) => {
    const timeoutId = setTimeout(() => {
      callback();
    }, delay);
    
    return () => {
      clearTimeout(timeoutId);
    };
  },
  
  /**
   * Format a timestamp into a readable time string
   */
  formatLastCheckedTime: (timestamp: number | null): string => {
    if (!timestamp) return 'Never';
    
    const now = new Date();
    const lastChecked = new Date(timestamp);
    const diffSeconds = Math.floor((now.getTime() - lastChecked.getTime()) / 1000);
    
    if (diffSeconds < 10) return 'Just now';
    if (diffSeconds < 60) return `${diffSeconds} seconds ago`;
    if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)} minutes ago`;
    
    return lastChecked.toLocaleTimeString();
  }
};
