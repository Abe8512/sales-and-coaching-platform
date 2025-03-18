
import React, { useContext, useState, useMemo } from "react";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";
import { ThemeContext } from "@/App";
import { cn } from "@/lib/utils";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const { isDarkMode } = useContext(ThemeContext);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Optimize classes with useMemo to prevent recalculation on every render
  const layoutClasses = useMemo(() => 
    cn("flex min-h-screen", isDarkMode ? 'bg-dark-purple' : 'bg-white'),
    [isDarkMode]
  );
  
  const mainClasses = useMemo(() => 
    cn(
      "flex-1 p-6 pt-16 overflow-y-auto transition-colors duration-200 hardware-accelerated",
      isDarkMode ? 'bg-dark-purple' : 'bg-gray-50'
    ),
    [isDarkMode]
  );

  return (
    <div className={layoutClasses}>
      <Sidebar isDarkMode={isDarkMode} />
      <div className="flex flex-col flex-1">
        <TopBar setSidebarOpen={setSidebarOpen} />
        <main className={mainClasses}>
          {children}
        </main>
      </div>
    </div>
  );
};

export default React.memo(DashboardLayout);
