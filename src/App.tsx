
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { createContext, useState, useEffect } from "react";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import PlaceholderPage from "./components/PlaceholderPage";

const queryClient = new QueryClient();

// Create a theme context
export const ThemeContext = createContext({
  isDarkMode: true,
  toggleTheme: () => {}
});

const App = () => {
  const [isDarkMode, setIsDarkMode] = useState(true);
  
  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
  };

  useEffect(() => {
    // Apply theme class to document on mount and when theme changes
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.add('light');
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeContext.Provider value={{ isDarkMode, toggleTheme }}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/call-activity" element={<PlaceholderPage title="Call Activity" />} />
              <Route path="/performance" element={<PlaceholderPage title="Performance" />} />
              <Route path="/transcripts" element={<PlaceholderPage title="Transcripts" />} />
              <Route path="/ai-coaching" element={<PlaceholderPage title="AI Coaching" />} />
              <Route path="/analytics" element={<PlaceholderPage title="Analytics" />} />
              <Route path="/team" element={<PlaceholderPage title="Team" />} />
              <Route path="/messaging" element={<PlaceholderPage title="Messaging" />} />
              <Route path="/settings" element={<PlaceholderPage title="Settings" />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </ThemeContext.Provider>
    </QueryClientProvider>
  );
};

export default App;
