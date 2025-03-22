import { useState, createContext, useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import './App.css';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';
import Index from './pages/Index';
import Login from './pages/Login';
import Signup from './pages/Signup';
import NotFound from './pages/NotFound';
import Transcripts from './pages/Transcripts';
import AICoaching from './pages/AICoaching';
import Team from './pages/Team';
import Settings from './pages/Settings';
import CallComparison from './pages/CallComparison';
import CallActivity from './pages/CallActivity';
import Performance from './pages/Performance';
import Admin from './pages/Admin';
import Analytics from './pages/Analytics';
import ProtectedRoute from './components/auth/ProtectedRoute';
import { AuthProvider } from './contexts/AuthContext';
import { SharedFilterProvider } from './contexts/SharedFilterContext';
import { useEventsStore } from './services/events';
import { ensureDatabaseSchema } from './services/SqlUtilService';
import { syncAllMetricsData } from './services/DataSyncService';

// Create Theme Context
export const ThemeContext = createContext({
  isDarkMode: false,
  toggleTheme: () => {},
});

// Create QueryClient
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
  },
});

function App() {
  const [isDarkMode, setIsDarkMode] = useState(
    window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
  );

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
  };

  // Add connection status change event listeners
  useEffect(() => {
    const { addEventListener } = useEventsStore.getState();
    
    // Listen for connection restored event
    const unsubscribeRestored = addEventListener('connection-restored', () => {
      toast.success('Connection restored', {
        description: 'Your connection to the server has been restored. All features are now available.',
        duration: 4000,
      });
    });
    
    // Listen for connection lost event
    const unsubscribeLost = addEventListener('connection-lost', () => {
      toast.error('Connection lost', {
        description: 'Connection to the server lost. Some features may be limited. Data will be saved locally.',
        duration: 5000,
      });
    });
    
    // Listen for unstable connection event
    const unsubscribeUnstable = addEventListener('connection-unstable', (event) => {
      const { retryCount, backoffTime } = event.data || {};
      const nextRetryIn = backoffTime ? Math.round(backoffTime / 1000) : 30;
      
      toast.warning('Unstable connection', {
        description: `Connection is unstable. Retry attempt ${retryCount || 1} will occur in ${nextRetryIn}s. Data is being saved locally.`,
        duration: 6000,
      });
    });
    
    // Cleanup function
    return () => {
      unsubscribeRestored();
      unsubscribeLost();
      unsubscribeUnstable();
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeContext.Provider value={{ isDarkMode, toggleTheme }}>
        <AuthProvider>
          <SharedFilterProvider>
            <Router>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
                <Route path="/" element={
                  <ProtectedRoute>
                    <Index />
                  </ProtectedRoute>
                } />
                <Route path="/transcripts" element={
                  <ProtectedRoute>
                    <Transcripts />
                  </ProtectedRoute>
                } />
                <Route path="/ai-coaching" element={
                  <ProtectedRoute>
                    <AICoaching />
                  </ProtectedRoute>
                } />
                <Route path="/team" element={
                  <ProtectedRoute>
                    <Team />
                  </ProtectedRoute>
                } />
                <Route path="/settings" element={
                  <ProtectedRoute>
                    <Settings />
                  </ProtectedRoute>
                } />
                <Route path="/call-comparison" element={
                  <ProtectedRoute>
                    <CallComparison />
                  </ProtectedRoute>
                } />
                <Route path="/call-activity" element={
                  <ProtectedRoute>
                    <CallActivity />
                  </ProtectedRoute>
                } />
                <Route path="/performance" element={
                  <ProtectedRoute>
                    <Performance />
                  </ProtectedRoute>
                } />
                <Route path="/analytics" element={
                  <ProtectedRoute>
                    <Analytics />
                  </ProtectedRoute>
                } />
                <Route path="/admin" element={
                  <ProtectedRoute>
                    <Admin />
                  </ProtectedRoute>
                } />
                <Route path="*" element={<NotFound />} />
              </Routes>
              <Toaster />
            </Router>
          </SharedFilterProvider>
        </AuthProvider>
      </ThemeContext.Provider>
    </QueryClientProvider>
  );
}

export default App;
