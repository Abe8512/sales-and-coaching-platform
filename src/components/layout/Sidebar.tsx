import React from "react";
import { Link } from "react-router-dom";
import { Activity, BarChart3, Bot, FileText, Home, LineChart, MessageSquare, Settings, Users, GitCompare, Brain, Shield, PieChart } from "lucide-react";
import { cn } from "@/lib/utils";

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
    <li className="mb-2">
      <Link
        to={path}
        className={cn(
          "flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group",
          active 
            ? isDarkMode 
              ? "bg-neon-purple/20 text-white" 
              : "bg-neon-purple/10 text-gray-800"
            : isDarkMode
              ? "text-gray-400 hover:bg-white/5 hover:text-white"
              : "text-gray-600 hover:bg-gray-100 hover:text-gray-800"
        )}
      >
        <Icon 
          size={20} 
          className={cn(
            "transition-colors",
            active 
              ? "text-neon-purple" 
              : isDarkMode
                ? "text-gray-400 group-hover:text-neon-purple"
                : "text-gray-500 group-hover:text-neon-purple"
          )} 
        />
        <span>{label}</span>
        {active && (
          <div className="ml-auto w-1.5 h-6 bg-neon-purple rounded-full" />
        )}
      </Link>
    </li>
  );
};

interface SidebarProps {
  isDarkMode: boolean;
}

const Sidebar = ({ isDarkMode }: SidebarProps) => {
  // Define the current path to determine which menu item is active
  const path = window.location.pathname;

  return (
    <aside className={`w-64 ${
      isDarkMode 
        ? "bg-dark-purple border-r border-white/5" 
        : "bg-white border-r border-gray-200"
    } flex flex-col h-screen sticky top-0`}>
      <div className="p-6">
        <div className="flex items-center gap-2">
          <Bot className="h-6 w-6 text-neon-blue" />
          <h1 className={`text-xl font-bold ${isDarkMode ? "text-white" : "text-gray-800"}`}>
            <span className="text-gradient-blue">AI</span>nalyzer
          </h1>
        </div>
      </div>
      
      <nav className="mt-2 flex-1">
        <ul className="px-2">
          <SidebarItem 
            icon={Home} 
            label="Dashboard" 
            path="/" 
            active={path === "/"} 
            isDarkMode={isDarkMode} 
          />
          <SidebarItem 
            icon={PieChart} 
            label="Analytics Hub" 
            path="/analytics" 
            active={path === "/analytics"} 
            isDarkMode={isDarkMode} 
          />
          <SidebarItem 
            icon={Activity} 
            label="Call Activity" 
            path="/call-activity" 
            active={path === "/call-activity"} 
            isDarkMode={isDarkMode} 
          />
          <SidebarItem 
            icon={LineChart} 
            label="Performance" 
            path="/performance" 
            active={path === "/performance"} 
            isDarkMode={isDarkMode} 
          />
          <SidebarItem 
            icon={FileText} 
            label="Transcripts" 
            path="/transcripts" 
            active={path === "/transcripts"} 
            isDarkMode={isDarkMode} 
          />
          <SidebarItem 
            icon={Brain} 
            label="AI Coaching" 
            path="/ai-coaching" 
            active={path === "/ai-coaching"} 
            isDarkMode={isDarkMode} 
          />
          <SidebarItem 
            icon={Users} 
            label="Team" 
            path="/team" 
            active={path === "/team"} 
            isDarkMode={isDarkMode} 
          />
          <SidebarItem 
            icon={GitCompare} 
            label="Call Comparison" 
            path="/call-comparison" 
            active={path === "/call-comparison"} 
            isDarkMode={isDarkMode} 
          />
          <SidebarItem 
            icon={MessageSquare} 
            label="Messaging" 
            path="/messaging" 
            active={path === "/messaging"} 
            isDarkMode={isDarkMode} 
          />
        </ul>
      </nav>
      
      <div className={`p-6 border-t ${isDarkMode ? "border-white/5" : "border-gray-200"}`}>
        <ul className="space-y-2">
          <SidebarItem 
            icon={Settings} 
            label="Settings" 
            path="/settings" 
            active={path === "/settings"} 
            isDarkMode={isDarkMode} 
          />
          <SidebarItem 
            icon={Shield} 
            label="Admin" 
            path="/admin" 
            active={path === "/admin"} 
            isDarkMode={isDarkMode} 
          />
        </ul>
      </div>
    </aside>
  );
};

export default Sidebar;
