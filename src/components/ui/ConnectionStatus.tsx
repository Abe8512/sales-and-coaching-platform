import React, { useEffect, useState } from 'react';
import { useConnectionStatus } from '@/services/ConnectionMonitorService';
import { checkSupabaseConnection } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Wifi, WifiOff, RefreshCw, WifiIcon } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface ConnectionStatusProps {
  showCard?: boolean;
  showDetails?: boolean;
  onConnectionChange?: (connected: boolean) => void;
}

const ConnectionStatus = ({ 
  showCard = false, 
  showDetails = false,
  onConnectionChange 
}: ConnectionStatusProps) => {
  const { isConnected, lastChecked, retryCount, retryBackoff, checkConnection } = useConnectionStatus();
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  useEffect(() => {
    if (onConnectionChange) {
      onConnectionChange(isConnected);
    }
  }, [isConnected, onConnectionChange]);
  
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const result = await checkConnection(true); // Pass true to reset backoff
      if (result.connected) {
        toast.success('Connection restored', {
          description: 'Successfully connected to the database.',
        });
      } else {
        toast.error('Connection check failed', {
          description: 'Unable to connect to the database. Will retry with exponential backoff.',
        });
      }
    } catch (err) {
      console.error('Error checking connection:', err);
      toast.error('Connection check failed', {
        description: 'Error checking connection status.',
      });
    } finally {
      setIsRefreshing(false);
    }
  };
  
  // Helper to format connection status message
  const getStatusMessage = () => {
    if (isConnected) return "Connected";
    if (retryCount > 0) {
      return `Offline (retry ${retryCount})`;
    }
    return "Offline";
  };
  
  // Helper to format retry information
  const getRetryInfo = () => {
    if (!retryCount || isConnected) return null;
    
    const nextRetryIn = Math.round(retryBackoff / 1000);
    return `Next retry in ${nextRetryIn}s`;
  };
  
  // Display connection status with retry information
  if (!showCard) {
    return (
      <div className="flex items-center text-sm">
        {isConnected ? (
          <Wifi className="h-4 w-4 text-green-500 mr-1" />
        ) : retryCount > 2 ? (
          <WifiIcon className="h-4 w-4 text-amber-500 mr-1" />
        ) : (
          <WifiOff className="h-4 w-4 text-red-500 mr-1" />
        )}
        <span className={cn(
          isConnected ? 'text-green-600' : retryCount > 2 ? 'text-amber-600' : 'text-red-600',
          "font-medium"
        )}>
          {getStatusMessage()}
        </span>
        {!isConnected && (
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-6 ml-1 px-1" 
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-3 w-3 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
        )}
        {showDetails && getRetryInfo() && (
          <span className="text-xs text-gray-500 ml-2">
            {getRetryInfo()}
          </span>
        )}
      </div>
    );
  }
  
  // Card view with more details
  const statusColor = isConnected 
    ? 'bg-green-50 border-green-200' 
    : retryCount > 2 
      ? 'bg-amber-50 border-amber-200' 
      : 'bg-red-50 border-red-200';
  
  const statusTextColor = isConnected 
    ? 'text-green-700' 
    : retryCount > 2 
      ? 'text-amber-700' 
      : 'text-red-700';
  
  const statusIcon = isConnected 
    ? <Wifi className="h-5 w-5 text-green-500 mr-2" />
    : retryCount > 2 
      ? <WifiIcon className="h-5 w-5 text-amber-500 mr-2" />
      : <WifiOff className="h-5 w-5 text-red-500 mr-2" />;
  
  return (
    <Card className={`p-4 ${statusColor} border`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          {statusIcon}
          <div>
            <p className={`font-medium ${statusTextColor}`}>
              {getStatusMessage()}
            </p>
            <div className="flex flex-col space-y-1">
              <p className="text-xs text-gray-500">
                Last checked: {lastChecked ? new Date(lastChecked).toLocaleTimeString() : 'Never'}
              </p>
              {getRetryInfo() && (
                <p className="text-xs text-gray-500">
                  {getRetryInfo()}
                </p>
              )}
              {!isConnected && retryCount > 3 && (
                <p className="text-xs text-amber-700">
                  Connection issues detected. Data saved locally.
                </p>
              )}
            </div>
          </div>
        </div>
        <Button 
          variant={isConnected ? "outline" : "secondary"} 
          size="sm" 
          onClick={handleRefresh}
          disabled={isRefreshing}
        >
          <RefreshCw className={`h-4 w-4 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} />
          Check Connection
        </Button>
      </div>
    </Card>
  );
};

export default ConnectionStatus;
