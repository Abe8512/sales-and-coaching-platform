import React, { useEffect, useState } from 'react';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertCircle, XCircle, AlertTriangle, Info, RefreshCw } from 'lucide-react';
import { errorHandler } from '@/services/ErrorHandlingService';

interface ErrorDisplayProps {
  error: Error | null;
  title?: string;
  retry?: () => Promise<unknown> | void;
  dismiss?: () => void;
  severity?: 'info' | 'warning' | 'error' | 'critical';
}

/**
 * A standardized error display component that follows the application error handling guidelines
 */
export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
  error,
  title,
  retry,
  dismiss,
  severity = 'error'
}) => {
  const [open, setOpen] = useState(true);
  
  // Log error to centralized error handling
  useEffect(() => {
    if (error) {
      errorHandler.handleError({
        message: title || error.message,
        technical: error,
        severity,
        actionable: !!retry,
        retry: retry ? async () => await Promise.resolve(retry()) : undefined
      }, 'ErrorDisplay.component');
    }
  }, [error, title, retry, severity]);
  
  if (!error || !open) {
    return null;
  }
  
  const handleDismiss = () => {
    setOpen(false);
    if (dismiss) {
      dismiss();
    }
  };
  
  const getIcon = () => {
    switch (severity) {
      case 'info':
        return <Info className="h-5 w-5" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-amber-500" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-destructive" />;
      case 'critical':
        return <AlertCircle className="h-5 w-5 text-destructive" />;
      default:
        return <AlertCircle className="h-5 w-5 text-destructive" />;
    }
  };
  
  const getVariant = () => {
    switch (severity) {
      case 'info':
        return 'default';
      case 'warning':
        return 'warning';
      case 'error':
      case 'critical':
        return 'destructive';
      default:
        return 'destructive';
    }
  };
  
  return (
    <Alert variant={getVariant() as any} className="my-4">
      <div className="flex items-start">
        {getIcon()}
        <div className="ml-3 flex-1">
          <AlertTitle className="font-semibold">
            {title || 'An error occurred'}
          </AlertTitle>
          <AlertDescription className="mt-1 text-sm">
            {error.message}
          </AlertDescription>
          
          {(retry || dismiss) && (
            <div className="mt-3 flex gap-2">
              {retry && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => retry()}
                  className="flex items-center gap-1"
                >
                  <RefreshCw className="h-3 w-3" />
                  Retry
                </Button>
              )}
              {dismiss && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleDismiss}
                >
                  Dismiss
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </Alert>
  );
};

/**
 * Hook to display errors in components 
 */
export const useErrorDisplay = () => {
  const [error, setError] = useState<Error | null>(null);
  const [severity, setSeverity] = useState<'info' | 'warning' | 'error' | 'critical'>('error');
  const [retryFn, setRetryFn] = useState<(() => Promise<unknown> | void) | undefined>(undefined);
  
  const showError = (
    newError: Error | string, 
    options?: { 
      severity?: 'info' | 'warning' | 'error' | 'critical',
      retry?: () => Promise<unknown> | void
    }
  ) => {
    const errorObj = typeof newError === 'string' ? new Error(newError) : newError;
    setError(errorObj);
    setSeverity(options?.severity || 'error');
    setRetryFn(options?.retry);
  };
  
  const clearError = () => {
    setError(null);
    setRetryFn(undefined);
  };
  
  const errorDisplay = error ? (
    <ErrorDisplay 
      error={error} 
      severity={severity}
      retry={retryFn} 
      dismiss={clearError} 
    />
  ) : null;
  
  return {
    error,
    showError,
    clearError,
    errorDisplay
  };
};

/**
 * HOC to add error handling capabilities to a component
 */
export function withErrorHandling<P>(
  Component: React.ComponentType<P & { 
    showError: (error: Error | string, options?: any) => void;
    clearError: () => void;
    errorDisplay: React.ReactNode;
  }>
) {
  return (props: P) => {
    const { error, showError, clearError, errorDisplay } = useErrorDisplay();
    
    return (
      <>
        <Component
          {...props}
          showError={showError}
          clearError={clearError}
          errorDisplay={errorDisplay}
        />
      </>
    );
  };
} 