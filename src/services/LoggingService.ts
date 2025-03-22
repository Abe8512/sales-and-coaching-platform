/**
 * Centralized logging service to standardize logging across the application
 * with environment-aware logging levels and log filtering.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LoggingOptions {
  enabled: boolean;
  minLevel: LogLevel;
  allowedModules?: string[];
  blockedModules?: string[];
  stackTraceOnError: boolean;
  truncateLength?: number;
}

// Default options for different environments
const DEFAULT_DEV_OPTIONS: LoggingOptions = {
  enabled: true,
  minLevel: 'debug',
  stackTraceOnError: true,
  truncateLength: 10000,
};

const DEFAULT_PROD_OPTIONS: LoggingOptions = {
  enabled: true,
  minLevel: 'warn',
  stackTraceOnError: false,
  truncateLength: 500,
};

// Helper to determine current environment
const isProd = (): boolean => {
  return import.meta.env.PROD === true || 
         import.meta.env.MODE === 'production' || 
         process.env.NODE_ENV === 'production';
};

const isLoggingEnabled = (): boolean => {
  return import.meta.env.VITE_ENABLE_LOGGING === 'true' || !isProd();
};

// Log level priorities for filtering
const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

/**
 * Centralized logging service for the application
 */
class LoggingService {
  private options: LoggingOptions;
  private lastErrorTimestamp: Record<string, number> = {};
  private errorCounts: Record<string, number> = {};
  
  constructor() {
    // Initialize with environment-appropriate defaults
    this.options = isProd() ? DEFAULT_PROD_OPTIONS : DEFAULT_DEV_OPTIONS;
    
    // Override from environment variables if available
    if (import.meta.env.VITE_ENABLE_LOGGING !== undefined) {
      this.options.enabled = import.meta.env.VITE_ENABLE_LOGGING === 'true';
    }
    
    if (import.meta.env.VITE_LOG_LEVEL) {
      const level = import.meta.env.VITE_LOG_LEVEL.toLowerCase();
      if (level in LOG_LEVEL_PRIORITY) {
        this.options.minLevel = level as LogLevel;
      }
    }
    
    console.log(`LoggingService initialized with level: ${this.options.minLevel}, enabled: ${this.options.enabled}`);
  }
  
  /**
   * Configure logging options
   * @param options Logging options to set
   */
  configure(options: Partial<LoggingOptions>): void {
    this.options = { ...this.options, ...options };
  }
  
  /**
   * Check if a log message should be displayed based on level and module
   * @param level Log level
   * @param module Source module name
   * @returns Whether the log should be displayed
   */
  private shouldLog(level: LogLevel, module?: string): boolean {
    // Check if logging is enabled globally
    if (!this.options.enabled) return false;
    
    // Check if the log level is high enough
    if (LOG_LEVEL_PRIORITY[level] < LOG_LEVEL_PRIORITY[this.options.minLevel]) {
      return false;
    }
    
    // Check allowed/blocked modules if specified
    if (module) {
      if (this.options.allowedModules && this.options.allowedModules.length > 0) {
        return this.options.allowedModules.some(m => module.includes(m));
      }
      
      if (this.options.blockedModules && this.options.blockedModules.length > 0) {
        return !this.options.blockedModules.some(m => module.includes(m));
      }
    }
    
    return true;
  }
  
  /**
   * Rate limit errors to prevent log spam
   * @param errorKey Unique key for the error type
   * @returns Whether the error should be logged
   */
  private shouldLogError(errorKey: string): boolean {
    const now = Date.now();
    const lastTime = this.lastErrorTimestamp[errorKey] || 0;
    const count = this.errorCounts[errorKey] || 0;
    
    // Update tracking
    this.lastErrorTimestamp[errorKey] = now;
    this.errorCounts[errorKey] = count + 1;
    
    // If it's been more than 10 seconds since the last error, reset count
    if (now - lastTime > 10000) {
      this.errorCounts[errorKey] = 1;
      return true;
    }
    
    // Exponential backoff: log 1st, 2nd, 4th, 8th, 16th, 32nd occurrences
    const shouldLog = count === 0 || 
                     (count & (count - 1)) === 0; // Check if count is a power of 2
    
    // If the count gets too high, start logging only occasionally
    if (count > 32) {
      return count % 16 === 0;
    }
    
    return shouldLog;
  }
  
  /**
   * Format the log message with module info
   * @param message Log message
   * @param module Source module
   * @returns Formatted message
   */
  private formatMessage(message: string, module?: string): string {
    if (module) {
      return `[${module}] ${message}`;
    }
    return message;
  }
  
  /**
   * Process any data to be logged, applying truncation if needed
   * @param data Data to process for logging
   * @returns Processed data
   */
  private processData(data: unknown[]): unknown[] {
    if (!this.options.truncateLength) return data;
    
    return data.map(item => {
      if (typeof item === 'string' && item.length > this.options.truncateLength!) {
        return `${item.substring(0, this.options.truncateLength!)}... (truncated)`;
      }
      return item;
    });
  }
  
  /**
   * Log a debug message
   * @param message Message to log
   * @param module Source module
   * @param data Additional data to log
   */
  debug(message: string, module?: string, ...data: unknown[]): void {
    if (!this.shouldLog('debug', module)) return;
    
    const formattedMessage = this.formatMessage(message, module);
    console.debug(formattedMessage, ...this.processData(data));
  }
  
  /**
   * Log an info message
   * @param message Message to log
   * @param module Source module
   * @param data Additional data to log
   */
  info(message: string, module?: string, ...data: unknown[]): void {
    if (!this.shouldLog('info', module)) return;
    
    const formattedMessage = this.formatMessage(message, module);
    console.info(formattedMessage, ...this.processData(data));
  }
  
  /**
   * Log a warning message
   * @param message Message to log
   * @param module Source module
   * @param data Additional data to log
   */
  warn(message: string, module?: string, ...data: unknown[]): void {
    if (!this.shouldLog('warn', module)) return;
    
    const formattedMessage = this.formatMessage(message, module);
    console.warn(formattedMessage, ...this.processData(data));
  }
  
  /**
   * Log an error message with rate limiting
   * @param message Error message
   * @param module Source module
   * @param error Error object
   * @param data Additional data to log
   */
  error(message: string, module?: string, error?: unknown, ...data: unknown[]): void {
    if (!this.shouldLog('error', module)) return;
    
    // Create a key for rate limiting based on message and module
    const errorKey = `${module || 'global'}-${message.substring(0, 50)}`;
    
    if (!this.shouldLogError(errorKey)) {
      // Skip logging but increment the count
      return;
    }
    
    const formattedMessage = this.formatMessage(message, module);
    const count = this.errorCounts[errorKey] || 1;
    
    // If this error has occurred multiple times, include the count
    if (count > 1) {
      console.error(`${formattedMessage} (occurred ${count} times)`, ...this.processData(data));
    } else {
      console.error(formattedMessage, ...this.processData(data));
    }
    
    // Log the error object separately if provided
    if (error) {
      if (this.options.stackTraceOnError && error instanceof Error) {
        console.error(error);
      } else {
        console.error('Error details:', error);
      }
    }
  }
  
  /**
   * Log a message with automatic level detection based on the Error type
   * @param message Message to log
   * @param module Source module
   * @param data Additional data to log (if the first item is an Error, it's handled specially)
   */
  log(message: string, module?: string, ...data: unknown[]): void {
    // Check if the first data item is an Error
    if (data.length > 0 && data[0] instanceof Error) {
      const error = data[0];
      const restData = data.slice(1);
      this.error(message, module, error, ...restData);
    } else if (isProd()) {
      // In production, use info level by default
      this.info(message, module, ...data);
    } else {
      // In development, use debug level by default
      this.debug(message, module, ...data);
    }
  }
  
  /**
   * Create a module-specific logger
   * @param module Module name
   * @returns Object with module-specific logging methods
   */
  getModuleLogger(module: string) {
    return {
      debug: (message: string, ...data: unknown[]) => this.debug(message, module, ...data),
      info: (message: string, ...data: unknown[]) => this.info(message, module, ...data),
      warn: (message: string, ...data: unknown[]) => this.warn(message, module, ...data),
      error: (message: string, error?: unknown, ...data: unknown[]) => this.error(message, module, error, ...data),
      log: (message: string, ...data: unknown[]) => this.log(message, module, ...data),
    };
  }
}

// Export a singleton instance
export const logger = new LoggingService();

// Export module loggers for common services
export const realtimeLogger = logger.getModuleLogger('RealtimeService');
export const databaseLogger = logger.getModuleLogger('DatabaseService');
export const supabaseLogger = logger.getModuleLogger('SupabaseClient');
export const apiLogger = logger.getModuleLogger('ApiService');

// Add userLogger to the existing loggers
export const userLogger = logger.getModuleLogger('UserService'); 