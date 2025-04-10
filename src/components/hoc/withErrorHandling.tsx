import React, { ComponentType } from 'react';
import ErrorDisplay from '@/components/ErrorDisplay';
import { ErrorSeverity } from '@/services/ErrorHandlingService';
import useErrorDisplay, { ErrorDisplayOptions } from '@/hooks/useErrorDisplay';

export interface WithErrorHandlingProps {
  errorDisplay?: React.ReactNode;
  setError: (error: Error | string, options?: ErrorDisplayOptions) => void;
  clearError: () => void;
  isError: boolean;
}

export interface WithErrorHandlingOptions {
  fallback?: ComponentType<{ error: Error | string | null }>;
  errorMessage?: string;
  severity?: ErrorSeverity;
  showDetails?: boolean;
  logToService?: boolean;
}

/**
 * Higher-order component that adds error handling capabilities
 * to a component
 */
export function withErrorHandling<P extends object>(
  Component: ComponentType<P & WithErrorHandlingProps>,
  options: WithErrorHandlingOptions = {}
) {
  const {
    fallback: ErrorFallback,
    errorMessage,
    severity = 'error',
    showDetails = false,
    logToService = true
  } = options;
  
  // Return a new component with error handling
  const WithErrorHandling: React.FC<P> = (props) => {
    const {
      error,
      title,
      severity: currentSeverity,
      showDetails: currentShowDetails,
      retry,
      setError,
      clearError,
      isError
    } = useErrorDisplay({
      severity,
      showDetails,
      title: errorMessage
    });
    
    // Render error fallback if there's an error and a fallback component is provided
    if (isError && ErrorFallback) {
      return <ErrorFallback error={error} />;
    }
    
    // Render the error display if there's an error
    const errorDisplay = isError ? (
      <ErrorDisplay
        error={error || ''}
        title={title}
        severity={currentSeverity}
        retry={retry}
        dismiss={clearError}
        showDetails={currentShowDetails}
      />
    ) : null;
    
    // Render the wrapped component with error props
    return (
      <Component
        {...props}
        errorDisplay={errorDisplay}
        setError={setError}
        clearError={clearError}
        isError={isError}
      />
    );
  };
  
  // Set display name for debugging
  const displayName = Component.displayName || Component.name || 'Component';
  WithErrorHandling.displayName = `withErrorHandling(${displayName})`;
  
  return WithErrorHandling;
}

export default withErrorHandling; 