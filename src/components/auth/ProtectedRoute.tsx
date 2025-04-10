import React, { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface ProtectedRouteProps {
  children: ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  // REMOVE DEVELOPMENT BYPASS - Restore original logic
  const { isAuthenticated, isLoading } = useAuth();
  
  // While checking authentication status, show a loading screen
  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-dark-purple">
        <div className="flex flex-col items-center">
          <div className="h-16 w-16 animate-spin rounded-full border-b-2 border-t-2 border-neon-purple"></div>
          <p className="mt-4 text-xl text-white">Loading...</p>
        </div>
      </div>
    );
  }
  
  // If not authenticated, redirect to login
  if (!isAuthenticated) {
    console.log("[ProtectedRoute] User not authenticated, redirecting to /login"); // Add log
    return <Navigate to="/login" replace />;
  }
  
  // If authenticated, render the children
  return <>{children}</>;
};

export default ProtectedRoute;
