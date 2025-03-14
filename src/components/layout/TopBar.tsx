
import React from "react";
import { Bell, ChevronDown, Search, User } from "lucide-react";
import AIWaveform from "../ui/AIWaveform";

interface TopBarProps {
  children?: React.ReactNode;
  isDarkMode: boolean;
}

const TopBar = ({ children, isDarkMode }: TopBarProps) => {
  return (
    <header className={`${isDarkMode ? 'bg-dark-purple/50 backdrop-blur-sm border-b border-white/5' : 'bg-white border-b border-gray-200'} h-16 px-6 flex items-center justify-between sticky top-0 z-10`}>
      <div className="flex items-center gap-2">
        <div className="w-96 relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className={`h-4 w-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
          </div>
          <input
            type="text"
            placeholder="Search calls, agents, metrics..."
            className={`w-full h-10 ${
              isDarkMode 
                ? 'bg-white/5 border border-white/10 text-white placeholder-gray-400' 
                : 'bg-gray-50 border border-gray-200 text-gray-800 placeholder-gray-500'
            } rounded-lg pl-10 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-neon-blue transition-all`}
          />
        </div>
      </div>
      
      <div className="flex items-center gap-6">
        <div className={`flex items-center gap-3 border-r ${isDarkMode ? 'border-white/10' : 'border-gray-200'} pr-6`}>
          <AIWaveform color={isDarkMode ? "blue" : "blue"} />
          <span className={`text-sm font-medium ${isDarkMode ? 'text-neon-blue' : 'text-neon-blue'}`}>AI Assistant Active</span>
        </div>
        
        {children && <div className="mx-4">{children}</div>}
        
        <button className="relative">
          <Bell className={`h-5 w-5 ${isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-800'} transition-colors`} />
          <span className="absolute -top-1 -right-1 bg-neon-red w-2 h-2 rounded-full"></span>
        </button>
        
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-neon-purple/20 flex items-center justify-center">
            <User className="h-4 w-4 text-neon-purple" />
          </div>
          <span className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>Alex Morgan</span>
          <ChevronDown className={`h-4 w-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
        </div>
      </div>
    </header>
  );
};

export default TopBar;
