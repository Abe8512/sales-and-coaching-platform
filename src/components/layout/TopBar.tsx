
import React from "react";
import { Bell, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import UserDropdown from "./UserDropdown";

interface TopBarProps {
  children?: React.ReactNode;
  isDarkMode: boolean;
}

const TopBar = ({ children, isDarkMode }: TopBarProps) => {
  return (
    <header className={`w-full border-b ${isDarkMode ? 'bg-dark-purple border-white/5' : 'bg-white border-gray-200'}`}>
      <div className="flex h-16 items-center justify-between px-6">
        <div className="relative flex-1">
          <Search className={`absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
          <Input
            type="search"
            placeholder="Search..."
            className={`w-full max-w-sm pl-10 h-9 ${
              isDarkMode 
                ? 'bg-white/5 border-white/10 placeholder-gray-500' 
                : 'bg-gray-100 border-gray-200 placeholder-gray-400'
            }`}
          />
        </div>
        
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" className="relative">
            <Bell className={`h-5 w-5 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
            <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-neon-purple text-[10px] text-white">
              3
            </span>
          </Button>
          
          {children}
          
          <UserDropdown />
        </div>
      </div>
    </header>
  );
};

export default TopBar;
