
import React from "react";
import { Activity, BarChart3, Bot, FileText, Home, LineChart, MessageSquare, Settings, Users } from "lucide-react";
import { cn } from "@/lib/utils";

const SidebarItem = ({ 
  icon: Icon, 
  label, 
  active = false 
}: { 
  icon: React.ElementType; 
  label: string; 
  active?: boolean;
}) => {
  return (
    <li className="mb-2">
      <a
        href="#"
        className={cn(
          "flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group",
          active 
            ? "bg-neon-purple/20 text-white" 
            : "text-gray-400 hover:bg-white/5 hover:text-white"
        )}
      >
        <Icon 
          size={20} 
          className={cn(
            "transition-colors",
            active 
              ? "text-neon-purple" 
              : "text-gray-400 group-hover:text-neon-purple"
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

const Sidebar = () => {
  return (
    <aside className="w-64 bg-dark-purple border-r border-white/5 flex flex-col h-screen sticky top-0">
      <div className="p-6">
        <div className="flex items-center gap-2">
          <Bot className="h-6 w-6 text-neon-blue" />
          <h1 className="text-xl font-bold text-white">
            <span className="text-gradient-blue">AI</span>nalyzer
          </h1>
        </div>
      </div>
      
      <nav className="mt-2 flex-1">
        <ul className="px-2">
          <SidebarItem icon={Home} label="Dashboard" active />
          <SidebarItem icon={Activity} label="Call Activity" />
          <SidebarItem icon={LineChart} label="Performance" />
          <SidebarItem icon={FileText} label="Transcripts" />
          <SidebarItem icon={Bot} label="AI Coaching" />
          <SidebarItem icon={BarChart3} label="Analytics" />
          <SidebarItem icon={Users} label="Team" />
          <SidebarItem icon={MessageSquare} label="Messaging" />
        </ul>
      </nav>
      
      <div className="p-6 border-t border-white/5">
        <SidebarItem icon={Settings} label="Settings" />
      </div>
    </aside>
  );
};

export default Sidebar;
