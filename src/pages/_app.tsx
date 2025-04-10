import React, { useEffect } from 'react';
// Use `any` for AppProps temporarily if `next/app` cannot be resolved
// import type { AppProps } from 'next/app';
import { errorBridgeService } from '../services/ErrorBridgeService';
// import AppLayout from '../components/layout/AppLayout'; // Remove AppLayout import
import AppErrorBoundary from '../components/ErrorHandling/AppErrorBoundary';
import { useAuth } from '../contexts/AuthContext';
import { useLocation } from 'react-router-dom';

import '../styles/globals.css';

function MyApp({ Component, pageProps }: any /* AppProps */) {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  
  // Non-auth routes that should use basic AppLayout even when logged in
  const publicRoutes = ['/login', '/signup', '/forgot-password'];
  const isPublicRoute = publicRoutes.includes(location.pathname);
  
  useEffect(() => {
    // Setup global error handlers
    const originalOnError = window.onerror;
    const originalOnUnhandledRejection = window.onunhandledrejection;

    window.onerror = (message, source, lineno, colno, error) => {
      errorBridgeService.handleGlobalError(message, source, lineno, colno, error);
      // Call original handler if it exists
      if (originalOnError) {
        originalOnError.call(window, message, source, lineno, colno, error);
      }
      return true; // Prevent default browser handling
    };

    window.onunhandledrejection = (event: PromiseRejectionEvent) => {
      errorBridgeService.handleUnhandledRejection(event);
      // Call original handler if it exists
      if (originalOnUnhandledRejection) {
        originalOnUnhandledRejection.call(window, event);
      }
      return true; // Prevent default browser handling
    };

    // Cleanup on component unmount
    return () => {
      window.onerror = originalOnError;
      window.onunhandledrejection = originalOnUnhandledRejection;
    };
  }, []);

  return (
    <AppErrorBoundary>
      {/* Remove AppLayout wrapper */}
      <Component {...pageProps} />
    </AppErrorBoundary>
  );
}

export default MyApp; 