
import React from 'react';
import { useConnectionStatus } from '@/services/ConnectionMonitorService';
import { Wifi, WifiOff, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface ConnectionStatusIndicatorProps {
  position?: 'bottom-right' | 'top-right' | 'inline';
}

export const ConnectionStatusIndicator: React.FC<ConnectionStatusIndicatorProps> = ({ 
  position = 'bottom-right'
}) => {
  const { isConnected, checkConnection } = useConnectionStatus();
  const [isChecking, setIsChecking] = React.useState(false);
  
  const handleRefresh = async () => {
    setIsChecking(true);
    await checkConnection();
    setTimeout(() => {
      setIsChecking(false);
    }, 1000);
  };
  
  // Define position styles
  const positionStyles = {
    'bottom-right': 'fixed bottom-4 right-4 z-50',
    'top-right': 'fixed top-4 right-4 z-50',
    'inline': 'inline-flex'
  };
  
  return (
    <TooltipProvider>
      <div className={position !== 'inline' ? positionStyles[position] : ''}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={isConnected ? "outline" : "destructive"}
              size="sm"
              className={`${position === 'inline' ? 'h-8 w-8' : 'h-10 w-10'} p-0 rounded-full ${isConnected ? 'bg-green-100 hover:bg-green-200' : ''}`}
              onClick={handleRefresh}
            >
              {isChecking ? (
                <RefreshCw className={`h-4 w-4 animate-spin ${isConnected ? 'text-green-600' : 'text-white'}`} />
              ) : isConnected ? (
                <Wifi className="h-4 w-4 text-green-600" />
              ) : (
                <WifiOff className="h-4 w-4 text-white" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>
              {isChecking 
                ? 'Checking connection...' 
                : isConnected 
                  ? 'Connected to database' 
                  : 'Disconnected - Using offline data'}
            </p>
            {!isConnected && (
              <p className="text-xs text-muted-foreground mt-1">Click to retry connection</p>
            )}
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
};

export default ConnectionStatusIndicator;
