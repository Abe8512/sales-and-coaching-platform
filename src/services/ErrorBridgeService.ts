/**
 * ErrorBridgeService - Provides centralized error handling and reporting
 * 
 * This service can be used to:
 * 1. Report errors to a server
 * 2. Log errors to the console in a structured way
 * 3. Display user-friendly error messages
 * 4. Track error frequency and patterns
 */

// Types of errors we want to categorize
export enum ErrorCategory {
  API = 'API Error',
  DATABASE = 'Database Error',
  AUTHENTICATION = 'Authentication Error',
  VALIDATION = 'Validation Error',
  NETWORK = 'Network Error',
  UI = 'UI Error',
  INTEGRATION = 'Integration Error',
  UNKNOWN = 'Unknown Error'
}

// Error with additional metadata
export interface EnhancedError {
  originalError: Error | unknown;
  message: string;
  category: ErrorCategory;
  timestamp: Date;
  context?: Record<string, any>;
  userId?: string;
  isFatal?: boolean;
}

class ErrorBridgeService {
  private static instance: ErrorBridgeService;
  private errors: EnhancedError[] = [];
  private errorListeners: ((error: EnhancedError) => void)[] = [];
  
  // Environment indicators
  private isDevelopment = process.env.NODE_ENV === 'development';
  private isProduction = process.env.NODE_ENV === 'production';
  
  // Make constructor private to enforce singleton
  private constructor() {
    // NOTE: Global error handlers (window.onerror, window.onunhandledrejection)
    // should be set up in the main application entry point (_app.tsx)
    // to ensure they are attached in the browser environment.
  }
  
  // Get the singleton instance
  public static getInstance(): ErrorBridgeService {
    if (!ErrorBridgeService.instance) {
      ErrorBridgeService.instance = new ErrorBridgeService();
    }
    return ErrorBridgeService.instance;
  }
  
  // Main method to report errors
  public reportError(
    error: Error | unknown,
    category: ErrorCategory = ErrorCategory.UNKNOWN,
    context?: Record<string, any>,
    isFatal: boolean = false
  ): void {
    const message = error instanceof Error ? error.message : String(error);
    
    const enhancedError: EnhancedError = {
      originalError: error,
      message,
      category,
      timestamp: new Date(),
      context,
      isFatal
    };
    
    // Add to local error store
    this.errors.push(enhancedError);
    
    // Log to console
    this.logError(enhancedError);
    
    // Notify all listeners
    this.notifyListeners(enhancedError);
    
    // If in production, send to remote logging service
    if (this.isProduction) {
      this.sendToRemoteService(enhancedError);
    }
  }
  
  // Log the error to console with styling based on severity
  private logError(error: EnhancedError): void {
    const { category, message, context, timestamp, isFatal } = error;
    
    // In development, we want more verbose logging
    if (this.isDevelopment) {
      console.group(`%c${isFatal ? '🔴 FATAL ERROR' : '⚠️ ERROR'}: ${category}`, 
        `color: ${isFatal ? 'red' : 'orange'}; font-weight: bold;`);
      console.log(`📝 Message: ${message}`);
      console.log(`🕒 Time: ${timestamp.toISOString()}`);
      
      if (context) {
        console.log('📋 Context:', context);
      }
      
      if (error.originalError instanceof Error && error.originalError.stack) {
        console.log('🔍 Stack:', error.originalError.stack);
      }
      
      console.groupEnd();
    } else {
      // Simpler logging for production
      console.error(`[${category}] ${message}`, { context, timestamp });
    }
  }
  
  // Send error to a remote logging service
  private sendToRemoteService(error: EnhancedError): void {
    // Placeholder for actual implementation (e.g., Sentry, LogRocket)
    console.log('[ErrorBridge] Sending error to remote service (mock):', error);
    /*
    try {
      const body = JSON.stringify({
        message: error.message,
        category: error.category,
        timestamp: error.timestamp.toISOString(),
        context: error.context,
        isFatal: error.isFatal
      });
      
      fetch('/api/log-error', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body
      }).catch(e => {
        console.error('Failed to send error to remote service', e);
      });
    } catch (e) {
      console.error('Error while formatting error for remote service:', e);
    }
    */
  }
  
  // Add an error listener
  public addErrorListener(listener: (error: EnhancedError) => void): () => void {
    this.errorListeners.push(listener);
    
    // Return function to remove this listener
    return () => {
      this.errorListeners = this.errorListeners.filter(l => l !== listener);
    };
  }
  
  // Notify all listeners about an error
  private notifyListeners(error: EnhancedError): void {
    this.errorListeners.forEach(listener => {
      try {
        listener(error);
      } catch (e) {
        // Don't let a listener error break the chain
        console.error('Error in error listener:', e);
      }
    });
  }
  
  // Get all recorded errors
  public getErrors(): ReadonlyArray<EnhancedError> {
    return [...this.errors];
  }
  
  // Clear all recorded errors
  public clearErrors(): void {
    this.errors = [];
  }
  
  // Method to be attached to window.onerror in _app.tsx
  public handleGlobalError = (message: Event | string, source?: string, lineno?: number, colno?: number, error?: Error): void => {
    let errorObject: Error | unknown;
    let errorMessage: string;
    let errorContext: Record<string, any> = {
      source,
      lineno,
      colno,
      type: 'global_error'
    };

    if (error) {
      // If an error object is provided, use it
      errorObject = error;
      errorMessage = error.message;
    } else if (typeof message === 'string') {
      // If only a message string is provided
      errorMessage = message;
      errorObject = new Error(errorMessage);
    } else if (message instanceof ErrorEvent) {
       // Handle ErrorEvent specifically (often from scripts)
       errorMessage = message.message;
       errorObject = message.error || new Error(errorMessage); // Use embedded error if available
       errorContext.filename = message.filename || source;
       errorContext.lineno = message.lineno || lineno;
       errorContext.colno = message.colno || colno;
    } else {
      // Fallback for other event types or unexpected scenarios
      errorMessage = 'Unknown global error';
      errorObject = new Error(errorMessage);
    }

    this.reportError(errorObject, ErrorCategory.UNKNOWN, errorContext, true); // Treat unhandled global errors as fatal
  }
  
  // Method to be attached to window.onunhandledrejection in _app.tsx
  public handleUnhandledRejection = (event: PromiseRejectionEvent): void => {
    this.reportError(
      event.reason || new Error('Unhandled promise rejection with no reason'),
      ErrorCategory.UNKNOWN,
      { type: 'unhandled_promise_rejection' },
      true // Treat unhandled rejections as fatal
    );
  }
}

// Export singleton instance
export const errorBridgeService = ErrorBridgeService.getInstance();

// Export a convenient error reporting function
export function reportError(
  error: Error | unknown,
  category: ErrorCategory = ErrorCategory.UNKNOWN,
  context?: Record<string, any>,
  isFatal: boolean = false
): void {
  errorBridgeService.reportError(error, category, context, isFatal);
}

export default errorBridgeService; 