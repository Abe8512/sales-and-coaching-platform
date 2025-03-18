
import React, { useContext } from "react";
import { ThemeContext } from "@/App";
import { Button } from "@/components/ui/button";
import { Moon, Sun, Menu } from "lucide-react";
import UserDropdown from "./UserDropdown";
import { useIsMobile } from "@/hooks/use-mobile";
import NotificationCenter from "../NotificationCenter/NotificationCenter";

interface TopBarProps {
  setSidebarOpen: (open: boolean) => void;
}

const TopBar = ({ setSidebarOpen }: TopBarProps) => {
  const { isDarkMode, toggleTheme } = useContext(ThemeContext);
  const isMobile = useIsMobile();

  return (
    <div className="fixed top-0 right-0 z-10 p-4">
      <div className="flex items-center gap-2">
        {isMobile && (
          <Button variant="outline" size="icon" onClick={() => setSidebarOpen(true)}>
            <Menu className="h-5 w-5" />
          </Button>
        )}
        
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={toggleTheme}
          className="text-muted-foreground"
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
