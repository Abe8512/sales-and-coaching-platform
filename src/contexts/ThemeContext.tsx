import React, { createContext, useContext } from 'react';
import { ThemeContext as AppThemeContext } from '@/App';

interface ThemeContextType {
  isDarkMode: boolean;
  toggleTheme?: () => void;
}

// Create a wrapper around the App's ThemeContext
export const useTheme = (): ThemeContextType => {
  const themeContext = useContext(AppThemeContext);
  
  if (themeContext === undefined) {
    return { 
      isDarkMode: false, // Default to light mode
      toggleTheme: () => console.warn('Theme context not available')
    };
  }
  
  return themeContext;
};

// Re-export the context for direct usage if needed
export const ThemeContext = AppThemeContext; 