
import { errorHandler } from './ErrorHandlingService';
import { checkSupabaseConnection, isConnected } from '@/integrations/supabase/client';
import { useEffect, useState, useCallback } from 'react';

/**
 * This service monitors connection status and provides hooks and utilities
 * for robust connection handling throughout the application
 */
class ConnectionMonitorService {
  private static instance: ConnectionMonitorService;
  private connectionCheckInterval: number | null = null;
  private listeners: Set<Function> = new Set();
  
  private constructor() {
    // Initialize automatic connection monitoring
    this.startConnectionMonitoring();
    
    // Listen for visibility changes to perform connection check when tab becomes visible
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', this.handleVisibilityChange);
    }
  }
  
  public static getInstance(): ConnectionMonitorService {
    if (!ConnectionMonitorService.instance) {
      ConnectionMonitorService.instance = new ConnectionMonitorService();
    }
    return ConnectionMonitorService.instance;
  }
  
  /**
   * Check connection when tab becomes visible
   */
  private handleVisibilityChange = () => {
    if (document.visibilityState === 'visible' && !isConnected()) {
      console.log('Tab became visible, checking connection...');
      this.checkConnection();
    }
  };
  
  /**
   * Start periodic connection monitoring
   */
  private startConnectionMonitoring(): void {
    // Clear any existing interval
    if (this.connectionCheckInterval) {
      clearInterval(this.connectionCheckInterval);
    }
    
    // Check connection status every 30 seconds
    this.connectionCheckInterval = window.setInterval(() => {
      this.checkConnection();
    }, 30000);
    
    // Also perform initial check
    this.checkConnection();
  }
  
  /**
   * Check Supabase connection status
   */
  public async checkConnection(): Promise<boolean> {
    try {
      const { connected } = await checkSupabaseConnection();
      
      // Notify all listeners about the connection status
      this.notifyListeners(connected);
      
      return connected;
    } catch (error) {
      console.error('Connection check failed:', error);
      
      // If check fails, assume we're not connected
      this.notifyListeners(false);
      return false;
    }
  }
  
  /**
   * Subscribe to connection status changes
   */
  public subscribe(callback: (isConnected: boolean) => void): () => void {
    this.listeners.add(callback);
    
    // Return unsubscribe function
    return () => {
      this.listeners.delete(callback);
    };
  }
  
  /**
   * Notify all listeners about connection status change
   */
  private notifyListeners(isConnected: boolean): void {
    this.listeners.forEach(listener => {
      try {
        listener(isConnected);
      } catch (error) {
        console.error('Error in connection listener:', error);
      }
    });
  }
  
  /**
   * Clean up resources when service is no longer needed
   */
  public cleanup(): void {
    if (this.connectionCheckInterval) {
      clearInterval(this.connectionCheckInterval);
      this.connectionCheckInterval = null;
    }
    
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    }
    
    this.listeners.clear();
  }
}

// Export singleton instance
export const connectionMonitor = ConnectionMonitorService.getInstance();

/**
 * React hook for components to subscribe to connection status
 */
export const useConnectionStatus = () => {
  const [isConnected, setIsConnected] = useState<boolean>(true);
  
  useEffect(() => {
    // Initial check
    connectionMonitor.checkConnection().then(setIsConnected);
    
    // Subscribe to changes
    const unsubscribe = connectionMonitor.subscribe(setIsConnected);
    
    return () => {
      unsubscribe();
    };
  }, []);
  
  const checkConnectionNow = useCallback(async () => {
    const status = await connectionMonitor.checkConnection();
    return status;
  }, []);
  
  return {
    isConnected,
    checkConnection: checkConnectionNow
  };
};
