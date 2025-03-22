import { toast } from 'sonner';
import { PostgrestError, PostgrestSingleResponse } from '@supabase/supabase-js';
import { eventHandlerService } from './EventHandlerService';

export type ErrorSeverity = 'info' | 'warning' | 'error' | 'critical';

export interface ErrorDetails {
  message: string;
  technical?: string | Error | unknown;
  severity?: ErrorSeverity;
  code?: string;
  actionable?: boolean;
  retry?: () => Promise<unknown>;
}

// Configuration for error handling
const ERROR_CONFIG = {
  // Enable/disable detailed logging in development mode
  detailedLogging: import.meta.env.DEV || import.meta.env.VITE_ENABLE_LOGGING === 'true',
  // Toast display duration in milliseconds
  toastDuration: {
    info: 3000,
    warning: 5000,
    error: 6000,
    critical: 8000
  }
};

// Add error tracking to prevent infinite loops
let errorCount = 0;
const ERROR_THRESHOLD = 10;
const ERROR_RESET_INTERVAL = 30000; // 30 seconds
let errorResetTimeout: ReturnType<typeof setTimeout> | null = null;

// Reset error count after interval
const resetErrorCount = () => {
  errorCount = 0;
  
  // Schedule next reset
  if (errorResetTimeout) {
    clearTimeout(errorResetTimeout);
  }
  errorResetTimeout = setTimeout(resetErrorCount, ERROR_RESET_INTERVAL);
};

// Schedule initial reset
if (typeof window !== 'undefined') {
  errorResetTimeout = setTimeout(resetErrorCount, ERROR_RESET_INTERVAL);
}

/**
 * Centralized error handler for consistent error processing throughout the application
 */
export const errorHandler = {
  /**
   * Handle a simple error with logging and optional UI feedback
   * @deprecated Use handleError instead for more consistent error handling
   * @param error The error to handle
   * @param options Options for error handling
   */
  handle: (error: Error | string | unknown, options?: { showToast?: boolean }) => {
    console.warn('Using deprecated errorHandler.handle() method. Please migrate to errorHandler.handleError()');
    
    // Log to console
    console.error('Application error:', error);
    
    // Basic message extraction
    let message: string;
    if (error instanceof Error) {
      message = error.message;
    } else if (typeof error === 'string') {
      message = error;
    } else {
      message = 'An unknown error occurred';
    }
    
    // Show toast if requested
    if (options?.showToast) {
      toast.error(message);
    }
    
    // Return formatted error info
    return {
      message,
      originalError: error,
      timestamp: new Date().toISOString()
    };
  },

  /**
   * Check if an error is network related
   * @param error The error to check
   */
  isNetworkError: (error: Error | string | unknown): boolean => {
    if (error instanceof Error) {
      return error.message.includes('network') || 
        error.message.includes('connection') ||
        error.name === 'NetworkError';
    }
    if (typeof error === 'string') {
      return error.includes('network') || error.includes('connection');
    }
    return !navigator.onLine;
  },
  
  /**
   * Enhanced error handler with proper categorization
   * @param details Error details object
   * @param context Optional context to identify where the error occurred
   */
  handleError: (details: ErrorDetails, context?: string) => {
    // Prevent infinite loops by tracking error frequency
    errorCount++;
    
    // If we hit the threshold, throttle errors and return basic info
    if (errorCount > ERROR_THRESHOLD) {
      console.warn(`Error threshold exceeded (${errorCount} errors). Throttling error handling.`);
      
      // Only log the error but don't process further to break potential loops
      if (errorCount === ERROR_THRESHOLD + 1) {
        // Dispatch a specialized event for error flooding
        eventHandlerService.dispatchEvent('api-error', {
          source: 'error-handler',
          data: {
            message: 'Too many errors, some errors are being throttled',
            errorCount
          }
        });
        
        // Show a single toast about the flooding instead of individual error toasts
        toast.error('Multiple errors detected. Check console for details.', {
          description: 'Error handling is temporarily throttled',
          duration: 5000
        });
      }
      
      return {
        id: `throttled-${Date.now().toString(36)}`,
        severity: 'error',
        message: 'Error throttled due to high frequency',
        context,
        timestamp: new Date().toISOString()
      };
    }
    
    const severity = details.severity || 'error';
    const errorId = `${context || 'app'}-${Date.now().toString(36)}`;
    
    // Format technical details to handle different types
    let technicalDetails: string;
    if (typeof details.technical === 'string') {
      technicalDetails = details.technical;
    } else if (details.technical instanceof Error) {
      const errorObj = details.technical as Error;
      technicalDetails = `${errorObj.name}: ${errorObj.message}`;
      if (errorObj.stack && ERROR_CONFIG.detailedLogging) {
        technicalDetails += `\n${errorObj.stack}`;
      }
    } else if (details.technical) {
      try {
        technicalDetails = JSON.stringify(details.technical);
      } catch (e) {
        technicalDetails = 'Error serializing technical details';
      }
    } else {
      technicalDetails = 'No technical details provided';
    }
    
    // Log to console with context and error ID for easier debugging
    if (ERROR_CONFIG.detailedLogging) {
      console.error(`Error [${context || 'app'}] [${errorId}]:`, {
        ...details,
        technicalDetails,
        timestamp: new Date().toISOString()
      });
    } else {
      console.error(`Error [${context || 'app'}] [${errorId}]: ${details.message}`);
    }
    
    // Handle connection-related errors by updating offline status
    if (technicalDetails.includes('network') || 
        technicalDetails.includes('connection') ||
        details.message.includes('offline') ||
        details.message.includes('connection')) {
      errorHandler.setOffline(true);
    }
    
    // Dispatch standard event for all errors
    eventHandlerService.dispatchEvent('api-error', {
      source: context || 'unknown',
      data: {
        message: details.message,
        errorId,
        severity,
        technical: technicalDetails
      }
    });
    
    // Show toast based on severity with appropriate styling and duration
    const toastDuration = ERROR_CONFIG.toastDuration[severity];
    
    switch (severity) {
      case 'info':
        toast.info(details.message, { duration: toastDuration });
        break;
      case 'warning':
        toast.warning(details.message, { duration: toastDuration });
        break;
      case 'critical':
        toast.error(details.message, {
          description: 'Please contact support if this persists',
          duration: toastDuration
        });
        break;
      case 'error':
      default:
        if (details.actionable && details.retry) {
          toast.error(details.message, {
            action: {
              label: 'Retry',
              onClick: () => details.retry?.(),
            },
            duration: toastDuration
          });
        } else {
          toast.error(details.message, { duration: toastDuration });
        }
        break;
    }
    
    // Return error info for possible further processing
    return {
      id: errorId,
      severity,
      message: details.message,
      context,
      timestamp: new Date().toISOString()
    };
  },

  // Connection status and listeners
  _isOffline: typeof navigator !== 'undefined' ? !navigator.onLine : false,
  _connectionListeners: new Set<(online: boolean) => void>(),

  /**
   * Subscribe to connection status changes
   * @param callback Function to call when connection status changes
   * @returns Function to unsubscribe
   */
  onConnectionChange: (callback: (online: boolean) => void): (() => void) => {
    errorHandler._connectionListeners.add(callback);
    // Return unsubscribe function
    return () => {
      errorHandler._connectionListeners.delete(callback);
    };
  },

  /**
   * Set the offline status and notify listeners
   * @param offline Whether the application is offline
   */
  setOffline: (offline: boolean): void => {
    if (errorHandler._isOffline !== offline) {
      console.log(`Setting connection status to: ${offline ? 'offline' : 'online'}`);
      errorHandler._isOffline = offline;
      
      // Notify all listeners
      errorHandler._connectionListeners.forEach(listener => {
        try {
          listener(!offline); // Pass online status (inverse of offline)
        } catch (error) {
          console.error('Error in connection status listener:', error);
        }
      });
      
      // Dispatch event for other components to listen for
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent(
          offline ? 'supabase-connection-lost' : 'supabase-connection-restored',
          { detail: { type: 'connection-status-change' } }
        ));
      }
    }
  },

  /**
   * Get the current offline status
   */
  get isOffline(): boolean {
    return errorHandler._isOffline;
  }
};

/**
 * Utility function to wrap async operations with consistent error handling
 * Generic T represents the expected successful response type
 */
export const withErrorHandling = async <T>(
  operation: () => Promise<PostgrestSingleResponse<T>>,
  fallback: PostgrestSingleResponse<T>,
  context: string,
  options?: {
    retry?: () => Promise<unknown>,
    message?: string
  }
): Promise<PostgrestSingleResponse<T>> => {
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

/**
 * Helper function to use the consistent error handling format
 * @deprecated Use errorHandler.handleError directly
 */
export function handleError(
  error: unknown, 
  context: string, 
  errorDetails: {
    message: string, 
    technical?: unknown, 
    severity: 'warning' | 'error' | 'info' | 'critical', 
    code: string
  }
) {
  console.warn('Using deprecated handleError function. Please migrate to errorHandler.handleError()');
  
  // Ensure we have a technical details object
  if (!errorDetails.technical) {
    errorDetails.technical = {};
  }
  
  // Add the original error to technical details for better debugging
  if (error && typeof error === 'object') {
    errorDetails.technical = {
      ...errorDetails.technical as Record<string, unknown>,
      originalError: error
    };
  }
  
  // Log to console with context
  if (errorDetails.technical) {
    console.error(`Error [${context}]:`, errorDetails.technical, error);
  } else {
    console.error(`Error [${context}]:`, error);
  }
  
  // Use the error handler
  errorHandler.handleError({
    message: errorDetails.message,
    technical: JSON.stringify(errorDetails.technical),
    severity: errorDetails.severity,
    code: errorDetails.code
  }, context);
}
