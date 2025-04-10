import { toast } from 'sonner';
import { PostgrestError, PostgrestSingleResponse } from '@supabase/supabase-js';
import { eventHandlerService } from './EventHandlerService';

/**
 * ErrorHandlingService - Main implementation for application-wide error handling.
 * This service is the preferred error handling mechanism for the application.
 */

/**
 * Error severity levels
 */
export type ErrorSeverity = 'info' | 'warning' | 'error' | 'critical';

/**
 * Error category types
 */
export enum ErrorCategory {
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization', 
  VALIDATION = 'validation',
  API = 'api',
  DATABASE = 'database',
  NETWORK = 'network',
  INTERNAL = 'internal',
  RUNTIME = 'runtime',
  UNKNOWN = 'unknown'
}

/**
 * Additional error context
 */
export interface ErrorContext {
  message?: string;
  category?: ErrorCategory;
  severity?: ErrorSeverity;
  source?: string;
  timestamp?: Date;
  operationId?: string;
  userId?: string;
  silent?: boolean;
  metadata?: Record<string, any>;
  [key: string]: any;
}

/**
 * Main error handling service class
 */
export class ErrorHandlingService extends EventTarget {
  private static instance: ErrorHandlingService;
  private errorCount: Record<ErrorCategory, number> = {
    [ErrorCategory.AUTHENTICATION]: 0,
    [ErrorCategory.AUTHORIZATION]: 0,
    [ErrorCategory.VALIDATION]: 0,
    [ErrorCategory.API]: 0,
    [ErrorCategory.DATABASE]: 0,
    [ErrorCategory.NETWORK]: 0,
    [ErrorCategory.INTERNAL]: 0,
    [ErrorCategory.RUNTIME]: 0,
    [ErrorCategory.UNKNOWN]: 0
  };
  
  private constructor() {
    super();
    this.setupGlobalHandlers();
  }
  
  /**
   * Get singleton instance
   */
  public static getInstance(): ErrorHandlingService {
    if (!this.instance) {
      this.instance = new ErrorHandlingService();
    }
    return this.instance;
  }
  
  /**
   * Main error handling method
   */
  public handleError(error: unknown, context: ErrorContext = {}): Error {
    // Normalize error to Error object
    const normalizedError = this.normalizeError(error);
    
    // Enhance with context
    const enhancedError = this.enhanceError(normalizedError, context);
    
    // Determine the error category
    const category = context.category || this.determineErrorCategory(enhancedError);
    
    // Increment error count
    this.errorCount[category]++;
    
    // Don't log or emit if silent is true
    if (!context.silent) {
      // Log the error
      this.logError(enhancedError, category, context.severity || 'error');
      
      // Dispatch error event
      this.dispatchErrorEvent(enhancedError, category, context);
      
      // Track error (could send to analytics service, etc.)
      this.trackError(enhancedError, category, context);
    }
    
    return enhancedError;
  }
  
  /**
   * Get error counts by category
   */
  public getErrorCounts(): Record<ErrorCategory, number> {
    return { ...this.errorCount };
  }
  
  /**
   * Reset error counts
   */
  public resetErrorCounts(): void {
    Object.keys(this.errorCount).forEach(key => {
      this.errorCount[key as ErrorCategory] = 0;
    });
  }
  
  /**
   * Clear any registered error handlers
   */
  public clearErrorHandlers(): void {
    // EventTarget doesn't have a clear method, so this would require additional tracking
    console.warn('ErrorHandlingService.clearErrorHandlers: Not implemented');
  }
  
  /**
   * Normalize any error type to an Error object
   */
  private normalizeError(error: unknown): Error {
    if (error instanceof Error) {
      return error;
    }
    
    if (typeof error === 'string') {
      return new Error(error);
    }
    
    if (typeof error === 'object' && error !== null) {
      const message = (error as any).message || 'Unknown error object';
      const newError = new Error(message);
      Object.assign(newError, error);
      return newError;
    }
    
    return new Error(`Unknown error: ${String(error)}`);
  }
  
  /**
   * Enhance the error with additional context
   */
  private enhanceError(error: Error, context: ErrorContext): Error {
    // Add metadata to the error
    (error as any).metadata = {
      ...(error as any).metadata || {},
      ...context,
      timestamp: context.timestamp || new Date()
    };
    
    // Override error message if provided
    if (context.message) {
      error.message = context.message;
    }
    
    return error;
  }
  
  /**
   * Determine the category of an error
   */
  private determineErrorCategory(error: Error): ErrorCategory {
    const errorString = error.toString().toLowerCase();
    const stack = error.stack || '';
    
    // Network errors
    if (
      errorString.includes('network') ||
      errorString.includes('connection') ||
      errorString.includes('offline') ||
      errorString.includes('timeout')
    ) {
      return ErrorCategory.NETWORK;
    }
    
    // Authentication errors
    if (
      errorString.includes('auth') ||
      errorString.includes('login') ||
      errorString.includes('credentials') ||
      errorString.includes('token') ||
      errorString.includes('unauthorized') ||
      errorString.includes('not logged in')
    ) {
      return ErrorCategory.AUTHENTICATION;
    }
    
    // Authorization errors
    if (
      errorString.includes('permission') ||
      errorString.includes('access denied') ||
      errorString.includes('forbidden') ||
      errorString.includes('not allowed')
    ) {
      return ErrorCategory.AUTHORIZATION;
    }
    
    // Validation errors
    if (
      errorString.includes('validation') ||
      errorString.includes('invalid') ||
      errorString.includes('required') ||
      errorString.includes('must be')
    ) {
      return ErrorCategory.VALIDATION;
    }
    
    // API errors
    if (
      errorString.includes('api') ||
      errorString.includes('endpoint') ||
      errorString.includes('response') ||
      stack.includes('fetch') ||
      stack.includes('axios')
    ) {
      return ErrorCategory.API;
    }
    
    // Database errors
    if (
      errorString.includes('database') ||
      errorString.includes('db') ||
      errorString.includes('query') ||
      errorString.includes('sql') ||
      errorString.includes('record') ||
      errorString.includes('supabase')
    ) {
      return ErrorCategory.DATABASE;
    }
    
    // Runtime errors (rendering, parsing, etc.)
    if (
      stack.includes('react') ||
      stack.includes('render') ||
      errorString.includes('parsing') ||
      errorString.includes('undefined is not an object') ||
      errorString.includes('cannot read property')
    ) {
      return ErrorCategory.RUNTIME;
    }
    
    // Internal application errors
    if (
      stack.includes('/src/') ||
      stack.includes('/services/') ||
      stack.includes('/utils/') ||
      stack.includes('/helpers/')
    ) {
      return ErrorCategory.INTERNAL;
    }
    
    return ErrorCategory.UNKNOWN;
  }
  
  /**
   * Log error to console
   */
  private logError(error: Error, category: ErrorCategory, severity: ErrorSeverity): void {
    const metadata = (error as any).metadata || {};
    const timestamp = metadata.timestamp ? metadata.timestamp.toISOString() : new Date().toISOString();
    
    // Format the logs based on severity
    const messagePrefix = `[${timestamp}] [${severity.toUpperCase()}] [${category}]`;
    
    switch (severity) {
      case 'critical':
        console.error(`${messagePrefix} CRITICAL ERROR:`, error);
        console.error('Error Details:', metadata);
        break;
        
      case 'error':
        console.error(`${messagePrefix} ERROR:`, error);
        console.error('Stack:', error.stack);
        break;
        
      case 'warning':
        console.warn(`${messagePrefix} WARNING:`, error.message);
        console.warn('Stack:', error.stack);
        break;
        
      case 'info':
        console.info(`${messagePrefix} INFO:`, error.message);
        break;
        
      default:
        console.log(`${messagePrefix}:`, error);
    }
  }
  
  /**
   * Dispatch a custom error event
   */
  private dispatchErrorEvent(error: Error, category: ErrorCategory, context: ErrorContext): void {
    const event = new CustomEvent('error', {
      detail: {
        error,
        category,
        ...context,
        timestamp: context.timestamp || new Date()
      },
      bubbles: false,
      cancelable: true
    });
    
    this.dispatchEvent(event);
  }
  
  /**
   * Track error (for analytics, monitoring, etc.)
   */
  private trackError(error: Error, category: ErrorCategory, context: ErrorContext): void {
    // Integration point for error tracking services like Sentry, LogRocket, etc.
    // This is just a placeholder for now
    if (process.env.NODE_ENV === 'production' && window.errorTrackingService) {
      try {
        (window as any).errorTrackingService.captureException(error, {
          tags: { category },
          extra: { ...context }
        });
      } catch (trackingError) {
        console.error('Failed to track error:', trackingError);
      }
    }
  }
  
  /**
   * Set up global error handlers
   */
  private setupGlobalHandlers(): void {
    if (typeof window !== 'undefined') {
      // Handle unhandled promise rejections
      window.addEventListener('unhandledrejection', (event) => {
        this.handleError(event.reason, {
          message: 'Unhandled Promise Rejection',
          severity: 'error'
        });
      });
      
      // Handle global errors
      window.addEventListener('error', (event) => {
        this.handleError(event.error || new Error(event.message), {
          message: 'Uncaught Error',
          source: event.filename,
          severity: 'error',
          metadata: {
            lineNumber: event.lineno,
            columnNumber: event.colno
          }
        });
        
        // Don't prevent default error handling
        return false;
      });
    }
  }
}

// Export a singleton instance for convenience
export const errorHandlingService = ErrorHandlingService.getInstance();

export type ErrorDetails = {
  message: string;
  technical?: string | Error | unknown;
  severity?: ErrorSeverity;
  code?: string;
  actionable?: boolean;
  retry?: () => Promise<unknown>;
};

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
