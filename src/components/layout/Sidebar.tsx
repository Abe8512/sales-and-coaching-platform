import React from "react";
import { Link, useLocation } from "react-router-dom";
import { Home, LayoutGrid, PhoneCall, LineChart, BarChart3, Settings, Users, LogOutIcon, FileText, Brain, GitCompare, MessageSquare, Shield, PieChart, Bot } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

interface SidebarItemProps {
  icon: React.ElementType;
  label: string;
  path: string;
  active?: boolean;
  isDarkMode: boolean;
}

const SidebarItem = ({ 
  icon: Icon, 
  label, 
  path,
  active = false,
  isDarkMode
}: SidebarItemProps) => {
  return (
    <li className="mb-1">
      <Link
        to={path}
        className={cn(
          "flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-200 group text-sm",
          active 
            ? isDarkMode 
              ? "bg-indigo-700 text-white font-medium"
              : "bg-indigo-100 text-indigo-700 font-medium"
            : isDarkMode
              ? "text-gray-300 hover:bg-gray-700 hover:text-white"
              : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
        )}
      >
        <Icon 
          size={18} 
          className={cn(
            "transition-colors",
            active 
              ? (isDarkMode ? "text-white" : "text-indigo-600")
              : isDarkMode
                ? "text-gray-400 group-hover:text-white"
                : "text-gray-500 group-hover:text-gray-700"
          )} 
        />
        <span>{label}</span>
      </Link>
    </li>
  );
};

interface SidebarProps {
  isDarkMode: boolean;
}

const Sidebar = ({ isDarkMode }: SidebarProps) => {
  const { user, logout, isAdmin } = useAuth();
  const location = useLocation();

  const sidebarClasses = cn(
    "sidebar-fixed flex flex-col w-64 border-r border-gray-200 pt-5 pb-4 h-full transition-colors duration-200",
    isDarkMode ? "bg-gradient-to-b from-dark-purple to-black border-gray-700" : "bg-white"
  );

  return (
    <div className={sidebarClasses}>
      <div className="flex items-center flex-shrink-0 px-4">
        <Bot className="h-6 w-6 text-neon-blue" />
        <h1 className={`text-xl font-bold ml-2 ${isDarkMode ? "text-white" : "text-gray-800"}`}>
          <span className="text-gradient-blue">AI</span>nalyzer 
        </h1>
      </div>
      <nav className="mt-5 flex-1 overflow-y-auto flex flex-col">
        <ul className="px-2 space-y-1 flex-grow">
          <SidebarItem icon={Home} label="Home / Status" path="/" active={location.pathname === "/"} isDarkMode={isDarkMode} />
          <SidebarItem icon={LayoutGrid} label="Metrics" path="/metrics" active={location.pathname === "/metrics"} isDarkMode={isDarkMode} />
          <SidebarItem icon={PhoneCall} label="Call Activity" path="/call-activity" active={location.pathname === "/call-activity"} isDarkMode={isDarkMode} />
          <SidebarItem icon={LineChart} label="Performance" path="/performance" active={location.pathname === "/performance"} isDarkMode={isDarkMode} />
          <SidebarItem icon={BarChart3} label="Analytics" path="/analytics" active={location.pathname === "/analytics"} isDarkMode={isDarkMode} />
          <SidebarItem icon={FileText} label="Transcripts" path="/transcripts" active={location.pathname === "/transcripts"} isDarkMode={isDarkMode} />
          <SidebarItem icon={Brain} label="AI Coaching" path="/ai-coaching" active={location.pathname === "/ai-coaching"} isDarkMode={isDarkMode} />
          <SidebarItem icon={Users} label="Team" path="/team" active={location.pathname === "/team"} isDarkMode={isDarkMode} />
          <SidebarItem icon={GitCompare} label="Call Comparison" path="/call-comparison" active={location.pathname === "/call-comparison"} isDarkMode={isDarkMode} />
        </ul>
        <div className={`mt-auto px-2 pt-4 border-t ${isDarkMode ? "border-gray-700" : "border-gray-200"}`}>
          <ul className="space-y-1">
            <SidebarItem icon={Settings} label="Settings" path="/settings" active={location.pathname === "/settings"} isDarkMode={isDarkMode} />
            {isAdmin && (
              <SidebarItem icon={Shield} label="Admin" path="/admin" active={location.pathname === "/admin"} isDarkMode={isDarkMode} />
            )}
          </ul>
          <div className="mt-4 p-2">
            <a href="#" onClick={(e) => { e.preventDefault(); logout(); }} className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm group transition-colors duration-200 ${isDarkMode ? 'text-red-400 hover:bg-red-900/50' : 'text-red-600 hover:bg-red-100'}`}>
              <LogOutIcon size={18} />
              <span>Logout</span>
            </a>
          </div>
        </div>
      </nav>
    </div>
  );
};

export default Sidebar;
