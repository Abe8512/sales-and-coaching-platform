import React, { Component, ErrorInfo, ReactNode } from 'react';
import { errorHandler } from '@/services/ErrorHandlingService';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * Error boundary component to catch and display errors in the component tree
 */
class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log the error to our error handling service
    errorHandler.handleError({
      message: error.message,
      technical: error,
      severity: 'error',
      code: 'react-error-boundary'
    }, 'ErrorBoundary.componentDidCatch');
    
    // Also update the component state with errorInfo
    this.setState({ errorInfo });
  }

  private handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
    
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  public render(): ReactNode {
    if (this.state.hasError) {
      // Custom fallback UI if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }
      
      // Default error UI
      return (
        <Card className="w-full max-w-md mx-auto my-8 border-destructive">
          <CardHeader className="bg-destructive/10">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-6 w-6 text-destructive" />
              <CardTitle>Something went wrong</CardTitle>
            </div>
            <CardDescription>
              An error occurred while rendering this component
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground mb-4">
              <p className="font-semibold mb-1">{this.state.error?.name || 'Error'}:</p>
              <p className="mb-2">{this.state.error?.message || 'Unknown error'}</p>
              
              {/* Only show stack in development mode */}
              {process.env.NODE_ENV === 'development' && (
                <details className="mt-2">
                  <summary className="cursor-pointer text-sm font-medium">
                    Error details
                  </summary>
                  <pre className="mt-2 whitespace-pre-wrap text-xs bg-muted p-4 rounded-md overflow-auto max-h-96">
                    {this.state.error?.stack || ''}
                  </pre>
                </details>
              )}
            </div>
          </CardContent>
          <CardFooter className="flex justify-end bg-muted/50">
            <Button 
              variant="outline" 
              onClick={this.handleReset}
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Try again
            </Button>
          </CardFooter>
        </Card>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary; 