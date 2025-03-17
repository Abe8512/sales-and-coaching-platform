
import React, { useContext, useState } from "react";
import { ThemeContext } from "@/App";
import { Button } from "@/components/ui/button";
import { Expand, RefreshCw } from "lucide-react";
import GlowingCard from "./ui/GlowingCard";
import { useToast } from "./ui/use-toast";

interface PlaceholderPageProps {
  title: string;
}

const PlaceholderPage = ({ title }: PlaceholderPageProps) => {
  const { isDarkMode } = useContext(ThemeContext);
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  
  const handleRefresh = () => {
    setIsLoading(true);
    toast({
      title: "Refreshing data",
      description: "Connecting to backend API...",
    });
    
    // Simulate API call
    setTimeout(() => {
      setIsLoading(false);
      toast({
        title: "Data refreshed",
        description: "Latest data has been loaded successfully",
      });
    }, 1500);
  };
  
  const handleExpand = () => {
    toast({
      title: "Expand view",
      description: `Expanded ${title} view will be implemented with backend data`,
    });
  };
  
  return (
    <div className="flex flex-col items-center justify-center h-screen">
      <GlowingCard gradient="blue" className="max-w-2xl w-full p-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className={`text-3xl font-bold ${isDarkMode ? "text-white" : "text-gray-800"}`}>
            {title} Page
          </h1>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="icon"
              onClick={handleExpand}
              className="border-blue-500/30 hover:bg-blue-500/10"
            >
              <Expand className="h-4 w-4 text-blue-500" />
            </Button>
            <Button 
              variant="outline" 
              size="icon" 
              onClick={handleRefresh}
              disabled={isLoading}
              className={`border-blue-500/30 hover:bg-blue-500/10 ${isLoading ? "animate-spin" : ""}`}
            >
              <RefreshCw className="h-4 w-4 text-blue-500" />
            </Button>
          </div>
        </div>
        
        <p className={`text-lg mb-8 ${isDarkMode ? "text-gray-300" : "text-gray-600"}`}>
          This page is ready for backend integration. When connected, you'll see real-time data here.
        </p>
        
        <div className={`p-6 rounded-lg ${isDarkMode ? "bg-white/5" : "bg-gray-50"} border ${isDarkMode ? "border-white/10" : "border-gray-200"}`}>
          <h2 className={`text-xl font-medium mb-4 ${isDarkMode ? "text-white" : "text-gray-800"}`}>Connection Status</h2>
          
          <div className="flex items-center gap-2 mb-2">
            <div className="w-3 h-3 rounded-full bg-amber-500"></div>
            <span className={`${isDarkMode ? "text-gray-300" : "text-gray-600"}`}>
              Backend API: <span className="font-medium">Ready to connect</span>
            </span>
          </div>
          
          <div className="flex items-center gap-2 mb-2">
            <div className="w-3 h-3 rounded-full bg-amber-500"></div>
            <span className={`${isDarkMode ? "text-gray-300" : "text-gray-600"}`}>
              Data Streaming: <span className="font-medium">Ready for configuration</span>
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-amber-500"></div>
            <span className={`${isDarkMode ? "text-gray-300" : "text-gray-600"}`}>
              WebSocket: <span className="font-medium">Ready to initialize</span>
            </span>
          </div>
        </div>
      </GlowingCard>
    </div>
  );
};

export default PlaceholderPage;
