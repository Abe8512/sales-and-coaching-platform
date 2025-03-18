
import { toast } from 'sonner';

export type ErrorSeverity = 'info' | 'warning' | 'error' | 'critical';

export interface ErrorDetails {
  message: string;
  technical?: string;
  severity?: ErrorSeverity;
  code?: string;
  actionable?: boolean;
  retry?: () => Promise<any>;
}

/**
 * Centralized error handling service that provides consistent error management
 * throughout the application with appropriate user feedback
 */
class ErrorHandlingService {
  /**
   * Records of recent errors to prevent duplicate notifications
   */
  private recentErrors: Map<string, number> = new Map();
  
  /**
   * Connection status tracking
   */
  private _isOffline: boolean = false;
  private _connectionListeners: Set<(online: boolean) => void> = new Set();

  constructor() {
    // Monitor online/offline status
    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.handleOnlineStatus);
      window.addEventListener('offline', this.handleOnlineStatus);
      
      // Initial check
      this._isOffline = !navigator.onLine;
    }
  }

  /**
   * Handle online/offline status changes
   */
  private handleOnlineStatus = () => {
    const isOnline = navigator.onLine;
    const wasOffline = this._isOffline;
    this._isOffline = !isOnline;
    
    // Only notify if status changed
    if (wasOffline !== this._isOffline) {
      if (this._isOffline) {
        toast.error("You're offline", {
          description: "Connection lost. Some features may be unavailable.",
          duration: 5000,
        });
      } else {
        toast.success("You're back online", {
          description: "Connection restored. Syncing data...",
          duration: 3000,
        });
      }
      
      // Notify listeners
      this._connectionListeners.forEach(listener => listener(isOnline));
    }
  };

  /**
   * Subscribe to connection status changes
   */
  public onConnectionChange(callback: (online: boolean) => void): () => void {
    this._connectionListeners.add(callback);
    // Return unsubscribe function
    return () => {
      this._connectionListeners.delete(callback);
    };
  }

  /**
   * Check if the application is currently offline
   */
  public get isOffline(): boolean {
    return this._isOffline;
  }

  /**
   * Handle and process errors with appropriate user feedback
   */
  public handleError(error: Error | ErrorDetails, context?: string): void {
    // Normalize error format
    const errorDetails = this.normalizeError(error, context);
    const errorKey = `${errorDetails.code || ''}:${errorDetails.message}`;
    
    // Prevent duplicate notifications within a short timeframe
    const now = Date.now();
    const lastShown = this.recentErrors.get(errorKey) || 0;
    
    if (now - lastShown > 5000) { // Show same error once per 5 seconds max
      this.recentErrors.set(errorKey, now);
      
      // Clean up old entries from recentErrors map
      this.cleanupRecentErrors();
      
      // Log technical details to console
      if (errorDetails.technical) {
        console.error(`Error [${context}]:`, errorDetails.technical, error);
      }
      
      // Show user-friendly notification based on severity
      this.showErrorNotification(errorDetails);
    }
  }
  
  /**
   * Clean up old error records to prevent memory leaks
   */
  private cleanupRecentErrors(): void {
    const now = Date.now();
    for (const [key, timestamp] of this.recentErrors.entries()) {
      if (now - timestamp > 30000) { // Remove entries older than 30 seconds
        this.recentErrors.delete(key);
      }
    }
  }
  
  /**
   * Convert any error to a standardized ErrorDetails format
   */
  private normalizeError(error: Error | ErrorDetails, context?: string): ErrorDetails {
    // Check if it's an Error instance
    if (error instanceof Error) {
      return {
        message: this.getUserFriendlyMessage(error.message),
        technical: error.stack || error.message,
        severity: 'error',
        code: context ? `${context}:${error.name}` : error.name,
      };
    } 
    // It's already an ErrorDetails object
    else if ('message' in error && typeof error.message === 'string') {
      return error as ErrorDetails;
    } 
    // Unknown error format
    else {
      return {
        message: 'An unexpected error occurred',
        technical: JSON.stringify(error),
        severity: 'error',
        code: 'UNKNOWN',
      };
    }
  }
  
  /**
   * Convert technical error messages into user-friendly language
   */
  private getUserFriendlyMessage(technicalMessage: string): string {
    // Database connection errors
    if (technicalMessage.includes('Failed to fetch') || 
        technicalMessage.includes('NetworkError') ||
        technicalMessage.includes('Network request failed')) {
      return 'Unable to connect to the server';
    }
    
    // Database errors
    if (technicalMessage.includes('invalid input syntax for type uuid')) {
      return 'Data format error';
    }
    
    // Authentication errors
    if (technicalMessage.includes('JWT expired')) {
      return 'Your session has expired. Please sign in again';
    }
    
    // Permission errors
    if (technicalMessage.includes('Permission denied')) {
      return 'You don\'t have permission to perform this action';
    }
    
    // Validation errors
    if (technicalMessage.includes('violates check constraint') || 
        technicalMessage.includes('validation failed')) {
      return 'Invalid data format';
    }
    
    // Keep original message if no specific user-friendly version is available
    return technicalMessage.length > 100 
      ? technicalMessage.substring(0, 100) + '...' 
      : technicalMessage;
  }
  
  /**
   * Display the appropriate notification to the user based on error severity
   */
  private showErrorNotification(error: ErrorDetails): void {
    switch (error.severity) {
      case 'info':
        toast.info(error.message);
        break;
      case 'warning':
        toast.warning(error.message);
        break;
      case 'critical':
        toast.error(error.message, {
          duration: 8000, // Keep critical errors visible longer
          description: 'Please contact support if this persists',
        });
        break;
      case 'error':
      default:
        // Include retry button if the error is actionable and has a retry function
        if (error.actionable && error.retry) {
          toast.error(error.message, {
            duration: 5000,
            action: {
              label: 'Retry',
              onClick: () => error.retry!(),
            },
          });
        } else {
          toast.error(error.message, {
            duration: 5000,
          });
        }
        break;
    }
  }
}

// Export singleton instance
export const errorHandler = new ErrorHandlingService();

/**
 * Utility function to wrap async operations with consistent error handling
 */
export const withErrorHandling = async <T>(
  operation: () => Promise<T>,
  fallback: T,
  context: string,
  options?: {
    retry?: () => Promise<T>,
    message?: string
  }
): Promise<T> => {
  try {
    return await operation();
  } catch (error) {
    errorHandler.handleError({
      message: options?.message || 'Operation failed',
      technical: error instanceof Error ? error.message : String(error),
      severity: 'error',
      code: context,
      actionable: !!options?.retry,
      retry: options?.retry
    }, context);
    
    return fallback;
  }
};

