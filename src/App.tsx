
import React, { createContext, useState, useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@radix-ui/react-tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "./contexts/AuthContext";
import { SharedFilterProvider } from "./contexts/SharedFilterContext";
import Index from "./pages/Index";
import Transcripts from "./pages/Transcripts";
import CallActivity from "./pages/CallActivity";
import AICoaching from "./pages/AICoaching";
import CallComparison from "./pages/CallComparison";
import Team from "./pages/Team";
import Performance from "./pages/Performance";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import NotFound from "./pages/NotFound";
import Settings from "./pages/Settings";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import './App.css';

// Create Theme Context
export interface ThemeContextType {
  isDarkMode: boolean;
  toggleTheme: () => void;
}

export const ThemeContext = createContext<ThemeContextType>({
  isDarkMode: false,
  toggleTheme: () => {},
});

// Create QueryClient
const queryClient = new QueryClient();

function App() {
  const [isDarkMode, setIsDarkMode] = useState(
    localStorage.getItem('theme') === 'dark' ||
    window.matchMedia('(prefers-color-scheme: dark)').matches
  );

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  const toggleTheme = () => {
    setIsDarkMode(prevMode => !prevMode);
  };

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <ThemeContext.Provider value={{ isDarkMode, toggleTheme }}>
            <SharedFilterProvider>
              <BrowserRouter>
                <Routes>
                  <Route path="/login" element={<Login />} />
                  <Route path="/signup" element={<Signup />} />
                  <Route element={<ProtectedRoute />}>
                    <Route path="/" element={<Index />} />
                    <Route path="/transcripts" element={<Transcripts />} />
                    <Route path="/call-activity" element={<CallActivity />} />
                    <Route path="/ai-coaching" element={<AICoaching />} />
                    <Route path="/call-comparison" element={<CallComparison />} />
                    <Route path="/team" element={<Team />} />
                    <Route path="/performance" element={<Performance />} />
                    <Route path="/settings" element={<Settings />} />
                  </Route>
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </BrowserRouter>
              <Toaster />
            </SharedFilterProvider>
          </ThemeContext.Provider>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
