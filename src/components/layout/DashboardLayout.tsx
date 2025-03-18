
import React, { useContext, useState } from "react";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";
import { ThemeContext } from "@/App";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const { isDarkMode } = useContext(ThemeContext);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className={`flex min-h-screen ${isDarkMode ? 'bg-dark-purple' : 'bg-white'}`}>
      <Sidebar isDarkMode={isDarkMode} />
      <div className="flex flex-col flex-1">
        <TopBar setSidebarOpen={setSidebarOpen} />
        <main className={`flex-1 p-6 pt-16 overflow-y-auto ${isDarkMode ? 'bg-dark-purple' : 'bg-gray-50'}`}>
          {children}
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
