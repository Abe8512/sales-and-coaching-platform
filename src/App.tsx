
import { useState, createContext, useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import './App.css';
import { Toaster } from '@/components/ui/sonner';
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
import ProtectedRoute from './components/auth/ProtectedRoute';
import { AuthProvider } from './contexts/AuthContext';
import { SharedFilterProvider } from './contexts/SharedFilterContext';

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
