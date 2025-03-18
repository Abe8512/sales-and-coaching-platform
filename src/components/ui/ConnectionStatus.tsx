
import React, { useEffect, useState } from 'react';
import { useConnectionStatus } from '@/services/ConnectionMonitorService';
import { checkSupabaseConnection } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';

interface ConnectionStatusProps {
  showCard?: boolean;
  onConnectionChange?: (connected: boolean) => void;
}

const ConnectionStatus = ({ showCard = false, onConnectionChange }: ConnectionStatusProps) => {
  const { isConnected, lastChecked } = useConnectionStatus();
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  useEffect(() => {
    if (onConnectionChange) {
      onConnectionChange(isConnected);
    }
  }, [isConnected, onConnectionChange]);
  
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const result = await checkSupabaseConnection();
      if (result.connected) {
        toast.success('Connection restored', {
          description: 'Successfully connected to the database.',
        });
      } else {
        toast.error('Connection check failed', {
          description: 'Unable to connect to the database.',
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
  
  if (!showCard) {
    return (
      <div className="flex items-center text-sm">
        {isConnected ? (
          <Wifi className="h-4 w-4 text-green-500 mr-1" />
        ) : (
          <WifiOff className="h-4 w-4 text-red-500 mr-1" />
        )}
        <span className={isConnected ? 'text-green-600' : 'text-red-600'}>
          {isConnected ? 'Connected' : 'Offline'}
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
      </div>
    );
  }
  
  return (
    <Card className={`p-4 ${isConnected ? 'bg-green-50' : 'bg-red-50'} border ${isConnected ? 'border-green-200' : 'border-red-200'}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          {isConnected ? (
            <Wifi className="h-5 w-5 text-green-500 mr-2" />
          ) : (
            <WifiOff className="h-5 w-5 text-red-500 mr-2" />
          )}
          <div>
            <p className={`font-medium ${isConnected ? 'text-green-700' : 'text-red-700'}`}>
              {isConnected ? 'Connected' : 'Offline'}
            </p>
            <p className="text-xs text-gray-500">
              Last checked: {lastChecked ? new Date(lastChecked).toLocaleTimeString() : 'Never'}
            </p>
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
