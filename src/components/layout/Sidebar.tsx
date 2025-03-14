
import React from "react";
import { Activity, BarChart3, Bot, FileText, Home, LineChart, MessageSquare, Settings, Users } from "lucide-react";
import { cn } from "@/lib/utils";

interface SidebarItemProps {
  icon: React.ElementType;
  label: string;
  active?: boolean;
  isDarkMode: boolean;
}

const SidebarItem = ({ 
  icon: Icon, 
  label, 
  active = false,
  isDarkMode
}: SidebarItemProps) => {
  return (
    <li className="mb-2">
      <a
        href="#"
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
      </a>
    </li>
  );
};

interface SidebarProps {
  isDarkMode: boolean;
}

const Sidebar = ({ isDarkMode }: SidebarProps) => {
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
          <SidebarItem icon={Home} label="Dashboard" active isDarkMode={isDarkMode} />
          <SidebarItem icon={Activity} label="Call Activity" isDarkMode={isDarkMode} />
          <SidebarItem icon={LineChart} label="Performance" isDarkMode={isDarkMode} />
          <SidebarItem icon={FileText} label="Transcripts" isDarkMode={isDarkMode} />
          <SidebarItem icon={Bot} label="AI Coaching" isDarkMode={isDarkMode} />
          <SidebarItem icon={BarChart3} label="Analytics" isDarkMode={isDarkMode} />
          <SidebarItem icon={Users} label="Team" isDarkMode={isDarkMode} />
          <SidebarItem icon={MessageSquare} label="Messaging" isDarkMode={isDarkMode} />
        </ul>
      </nav>
      
      <div className={`p-6 border-t ${isDarkMode ? "border-white/5" : "border-gray-200"}`}>
        <SidebarItem icon={Settings} label="Settings" isDarkMode={isDarkMode} />
      </div>
    </aside>
  );
};

export default Sidebar;
