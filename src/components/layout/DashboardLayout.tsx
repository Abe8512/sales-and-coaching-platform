
import React, { useState, useEffect } from "react";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";
import { Sun, Moon } from "lucide-react";
import { Switch } from "@/components/ui/switch";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const [isDarkMode, setIsDarkMode] = useState(true);

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
    <div className={`flex min-h-screen ${isDarkMode ? 'bg-dark-purple' : 'bg-white'}`}>
      <Sidebar isDarkMode={isDarkMode} />
      <div className="flex flex-col flex-1">
        <TopBar isDarkMode={isDarkMode}>
          <div className="flex items-center gap-2">
            <Sun className={`h-4 w-4 ${isDarkMode ? 'text-gray-400' : 'text-neon-blue'}`} />
            <Switch 
              checked={isDarkMode} 
              onCheckedChange={() => setIsDarkMode(!isDarkMode)} 
            />
            <Moon className={`h-4 w-4 ${isDarkMode ? 'text-neon-purple' : 'text-gray-400'}`} />
          </div>
        </TopBar>
        <main className={`flex-1 p-6 overflow-y-auto ${isDarkMode ? 'bg-dark-purple' : 'bg-gray-50'}`}>
          {children}
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
