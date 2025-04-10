import React, { useContext } from "react";
import { ThemeContext } from "@/App";
import { Button } from "@/components/ui/button";
import { Moon, Sun, Menu } from "lucide-react";
import UserDropdown from "./UserDropdown";
import { useIsMobile } from "@/hooks/use-mobile";
import NotificationCenter from "../NotificationCenter/NotificationCenter";
import ConnectionStatus from "../ui/ConnectionStatus";
import RoleSwitcher from "../dev/RoleSwitcher";

interface TopBarProps {
  setSidebarOpen: (open: boolean) => void;
}

const TopBar = ({ setSidebarOpen }: TopBarProps) => {
  const { isDarkMode, toggleTheme } = useContext(ThemeContext);
  const isMobile = useIsMobile();
  const isDev = import.meta.env.MODE === 'development';

  return (
    <div className={`fixed top-0 left-0 md:left-64 right-0 z-30 h-16 border-b flex items-center justify-between px-4 md:px-6 transition-colors duration-200 ${isDarkMode ? 'bg-dark-purple border-gray-700' : 'bg-white border-gray-200'}`}>
      <div className="flex items-center gap-2">
        {isMobile && (
          <Button variant="outline" size="icon" onClick={() => setSidebarOpen(true)}>
            <Menu className="h-5 w-5" />
          </Button>
        )}
      </div>

      <div className="flex items-center gap-2 md:gap-4">
        {isDev && <RoleSwitcher />}
        
        <ConnectionStatus showDetails />
        
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={toggleTheme}
          className="text-muted-foreground hover:text-foreground"
          aria-label="Toggle theme"
        >
          {isDarkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </Button>
        
        <NotificationCenter />
        
        <UserDropdown />
      </div>
    </div>
  );
};

export default TopBar;
