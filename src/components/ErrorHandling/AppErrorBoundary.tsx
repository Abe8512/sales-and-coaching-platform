import React, { Component, ErrorInfo, ReactNode, CSSProperties } from 'react';
import { errorBridgeService, ErrorCategory, EnhancedError } from '../../services/ErrorBridgeService';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: EnhancedError | null;
}

class AppErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(_: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error: null }; // Error details captured in componentDidCatch
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Report the error using the singleton instance
    const enhancedError: EnhancedError = {
      originalError: error,
      message: error.message,
      category: ErrorCategory.UI, // Assume UI error if caught by boundary
      timestamp: new Date(),
      context: { componentStack: errorInfo.componentStack },
      isFatal: true // Errors caught here are usually fatal for the component tree
    };
    
    this.setState({ error: enhancedError });
    
    errorBridgeService.reportError(
      error, 
      ErrorCategory.UI, 
      { componentStack: errorInfo.componentStack }, 
      true
    );
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      return (
        <div style={styles.container}>
          <h1 style={styles.title}>Something went wrong.</h1>
          <p style={styles.message}>
            We've encountered an unexpected error. Please try reloading the page.
          </p>
          {this.state.error && (
            <div style={styles.errorDetails}>
              <p><strong>Error:</strong> {this.state.error.message}</p>
              <pre style={styles.pre}>
                {/* Check if originalError is an Error instance before accessing stack */}
                {this.state.error.originalError instanceof Error 
                  ? this.state.error.originalError.stack 
                  : 'No stack trace available'}
              </pre>
            </div>
          )}
          <button 
            style={styles.button}
            onClick={() => window.location.reload()}
          >
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

const styles: { [key: string]: CSSProperties } = {
  container: {
    maxWidth: '800px',
    margin: '2rem auto',
    padding: '2rem',
    borderRadius: '8px',
    backgroundColor: 'white',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
    textAlign: 'center' as const,
  },
  title: {
    marginBottom: '1rem'
  },
  message: {
    marginBottom: '1.5rem'
  },
  errorDetails: {
    margin: '1.5rem 0',
    padding: '1rem',
    backgroundColor: '#f8f8f8',
    borderRadius: '4px',
    textAlign: 'left' as const,
    overflow: 'auto'
  },
  pre: {
    margin: 0,
    fontFamily: 'monospace',
    fontSize: '0.85rem',
    color: '#e53e3e'
  },
  button: {
    padding: '0.75rem 1.5rem',
    backgroundColor: '#3182ce',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontWeight: 'bold'
  }
};

export default AppErrorBoundary; 