
import React from "react";
import { Bell, ChevronDown, Search, User } from "lucide-react";
import AIWaveform from "../ui/AIWaveform";

const TopBar = () => {
  return (
    <header className="bg-dark-purple/50 backdrop-blur-sm border-b border-white/5 h-16 px-6 flex items-center justify-between sticky top-0 z-10">
      <div className="flex items-center gap-2">
        <div className="w-96 relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search calls, agents, metrics..."
            className="w-full h-10 bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-neon-blue transition-all"
          />
        </div>
      </div>
      
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-3 border-r border-white/10 pr-6">
          <AIWaveform />
          <span className="text-sm font-medium text-neon-blue">AI Assistant Active</span>
        </div>
        
        <button className="relative">
          <Bell className="h-5 w-5 text-gray-400 hover:text-white transition-colors" />
          <span className="absolute -top-1 -right-1 bg-neon-red w-2 h-2 rounded-full"></span>
        </button>
        
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-neon-purple/20 flex items-center justify-center">
            <User className="h-4 w-4 text-neon-purple" />
          </div>
          <span className="text-sm font-medium text-white">Alex Morgan</span>
          <ChevronDown className="h-4 w-4 text-gray-400" />
        </div>
      </div>
    </header>
  );
};

export default TopBar;
