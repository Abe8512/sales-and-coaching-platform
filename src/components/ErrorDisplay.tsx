import React from 'react';
import { ErrorSeverity } from '@/services/ErrorHandlingService';

interface ErrorDisplayProps {
  error: Error | string;
  title?: string;
  severity?: ErrorSeverity;
  retry?: () => void;
  dismiss?: () => void;
  showDetails?: boolean;
}

/**
 * A standardized component for displaying errors
 */
const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
  error,
  title,
  severity = 'error',
  retry,
  dismiss,
  showDetails = false
}) => {
  const errorMessage = typeof error === 'string' ? error : error.message;
  const errorDetails = typeof error === 'string' ? undefined : error.stack;
  
  // Map severity to UI classes
  const severityClasses = {
    info: 'bg-blue-50 text-blue-800 border-blue-300',
    warning: 'bg-yellow-50 text-yellow-800 border-yellow-300',
    error: 'bg-red-50 text-red-800 border-red-300',
    critical: 'bg-red-100 text-red-900 border-red-500'
  };
  
  // Map severity to icons (if using an icon library)
  const severityIcons = {
    info: 'information-circle',
    warning: 'exclamation-triangle',
    error: 'exclamation-circle',
    critical: 'exclamation'
  };
  
  const containerClass = severityClasses[severity] || severityClasses.error;
  const iconName = severityIcons[severity] || severityIcons.error;
  
  return (
    <div className={`rounded-md border p-4 my-4 ${containerClass}`} role="alert">
      <div className="flex items-start">
        <div className="flex-shrink-0">
          {/* Icon placeholder - replace with your icon component */}
          <span className="inline-block h-5 w-5" aria-hidden="true">
            {iconName === 'information-circle' && 'ⓘ'}
            {iconName === 'exclamation-triangle' && '⚠'}
            {iconName === 'exclamation-circle' && '⚠'}
            {iconName === 'exclamation' && '❗'}
          </span>
        </div>
        
        <div className="ml-3 w-full">
          <h3 className="text-sm font-medium">
            {title || (severity === 'error' || severity === 'critical' 
              ? 'An error occurred' 
              : severity === 'warning' 
                ? 'Warning' 
                : 'Information'
            )}
          </h3>
          
          <div className="mt-2 text-sm">
            <p>{errorMessage}</p>
            
            {showDetails && errorDetails && (
              <details className="mt-2">
                <summary className="text-xs cursor-pointer">Show technical details</summary>
                <pre className="mt-2 text-xs overflow-auto p-2 bg-gray-100 rounded">
                  {errorDetails}
                </pre>
              </details>
            )}
          </div>
          
          {(retry || dismiss) && (
            <div className="mt-4 flex gap-2">
              {retry && (
                <button
                  type="button"
                  onClick={retry}
                  className="rounded-md bg-white px-3 py-2 text-sm font-semibold shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
                >
                  Retry
                </button>
              )}
              
              {dismiss && (
                <button
                  type="button"
                  onClick={dismiss}
                  className="rounded-md bg-white px-3 py-2 text-sm font-semibold shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
                >
                  Dismiss
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ErrorDisplay; 