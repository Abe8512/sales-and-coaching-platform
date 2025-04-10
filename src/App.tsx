import { useState, createContext, useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import './App.css';
import { Toaster } from '@/components/ui/toaster';
import { useToast } from "@/hooks/use-toast";
import IndexPage from './pages/Index';
import LoginPage from './pages/Login';
import SignupPage from './pages/Signup';
import NotFoundPage from './pages/NotFound';
import TranscriptsPage from './pages/Transcripts';
import AICoachingPage from './pages/AICoaching';
import TeamPage from './pages/Team';
import SettingsPage from './pages/Settings';
import CallComparisonPage from './pages/CallComparison';
import CallActivityPage from './pages/CallActivity';
import PerformancePage from './pages/Performance';
import AdminPage from './pages/Admin';
import AnalyticsPage from './pages/Analytics';
import MetricsPage from './pages/metrics';
import ProtectedRoute from './components/auth/ProtectedRoute';
import { AuthProvider } from './contexts/AuthContext';
import { SharedFilterProvider } from './contexts/SharedFilterContext';
import { useEventsStore } from './services/events';
import { syncAllMetricsData } from './services/DataSyncService';
import DashboardLayout from './components/layout/DashboardLayout';

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
  const { toast } = useToast();

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

  useEffect(() => {
    const { addEventListener } = useEventsStore.getState();
    
    const unsubscribeRestored = addEventListener('connection-restored', () => {
      toast({ 
          title: 'Connection restored', 
          description: 'Your connection to the server has been restored. All features are now available.',
      }); 
    });
    
    const unsubscribeLost = addEventListener('connection-lost', () => {
      toast({ 
          title: 'Connection lost', 
          description: 'Connection to the server lost. Some features may be limited. Data will be saved locally.',
          variant: "destructive"
      }); 
    });
    
    const unsubscribeUnstable = addEventListener('connection-unstable', (event: any) => {
      const { retryCount, backoffTime } = event.data || {};
      const nextRetryIn = backoffTime ? Math.round(backoffTime / 1000) : 30;
      toast({ 
          title: 'Unstable connection', 
          description: `Connection is unstable. Retry attempt ${retryCount || 1} will occur in ${nextRetryIn}s. Data is being saved locally.`,
          variant: "default"
      });
    });
    
    return () => {
      unsubscribeRestored();
      unsubscribeLost();
      unsubscribeUnstable();
    };
  }, [toast]);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeContext.Provider value={{ isDarkMode, toggleTheme }}>
        <AuthProvider>
          <SharedFilterProvider>
            <Router>
              <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/signup" element={<SignupPage />} />
                <Route path="/" element={<ProtectedRoute><DashboardLayout><IndexPage /></DashboardLayout></ProtectedRoute>} />
                <Route path="/transcripts" element={<ProtectedRoute><DashboardLayout><TranscriptsPage /></DashboardLayout></ProtectedRoute>} />
                <Route path="/ai-coaching" element={<ProtectedRoute><DashboardLayout><AICoachingPage /></DashboardLayout></ProtectedRoute>} />
                <Route path="/team" element={<ProtectedRoute><DashboardLayout><TeamPage /></DashboardLayout></ProtectedRoute>} />
                <Route path="/settings" element={<ProtectedRoute><DashboardLayout><SettingsPage /></DashboardLayout></ProtectedRoute>} />
                <Route path="/call-comparison" element={<ProtectedRoute><DashboardLayout><CallComparisonPage /></DashboardLayout></ProtectedRoute>} />
                <Route path="/call-activity" element={<ProtectedRoute><DashboardLayout><CallActivityPage /></DashboardLayout></ProtectedRoute>} />
                <Route path="/performance" element={<ProtectedRoute><DashboardLayout><PerformancePage /></DashboardLayout></ProtectedRoute>} />
                <Route path="/analytics" element={<ProtectedRoute><DashboardLayout><AnalyticsPage /></DashboardLayout></ProtectedRoute>} />
                <Route path="/admin" element={<ProtectedRoute><DashboardLayout><AdminPage /></DashboardLayout></ProtectedRoute>} />
                <Route path="/metrics" element={<ProtectedRoute><DashboardLayout><MetricsPage /></DashboardLayout></ProtectedRoute>} />
                <Route path="*" element={<NotFoundPage />} />
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
