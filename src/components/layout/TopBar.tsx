
import React, { useContext } from "react";
import { ThemeContext } from "@/App";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Menu, Moon, Search, Sun } from "lucide-react";
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
    <div className={`fixed top-0 left-0 w-full border-b z-10 ${isDarkMode ? "bg-black/50 backdrop-blur-xl border-white/10" : "bg-white/50 backdrop-blur-xl border-black/10"}`}>
      <div className="px-4 h-16 flex justify-between items-center">
        <div className="flex items-center gap-3">
          {isMobile && (
            <Button variant="outline" size="icon" onClick={() => setSidebarOpen(true)}>
              <Menu className="h-5 w-5" />
            </Button>
          )}
          <div className="relative max-w-md w-full hidden sm:block">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search..." 
              className="pl-8 bg-background w-full" 
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
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
    </div>
  );
};

export default TopBar;
