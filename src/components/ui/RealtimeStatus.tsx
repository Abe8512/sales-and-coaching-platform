import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { realtimeService, REALTIME_TABLES } from '@/services/RealtimeService';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, Zap, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useConnectionStatus } from '@/services/ConnectionMonitorService';
import { errorHandler } from '@/services/ErrorHandlingService';

const RealtimeStatus = () => {
  const [tableStatus, setTableStatus] = useState<{[key: string]: boolean}>({});
  const [loading, setLoading] = useState(false);
  const [enabling, setEnabling] = useState(false);
  const { isConnected } = useConnectionStatus();
  
  const checkRealtimeStatus = async () => {
    if (!isConnected) {
      errorHandler.handleError({
        message: 'Cannot check realtime status',
        technical: 'No database connection',
        severity: 'warning',
        code: 'REALTIME_CHECK_OFFLINE'
      }, 'RealtimeStatus');
      return;
    }
    
    setLoading(true);
    const statuses: {[key: string]: boolean} = {};
    
    try {
      const results = await realtimeService.checkRealtimeForAllTables();
      
      // Process results
      for (const result of results) {
        statuses[result.table] = result.enabled;
      }
      
      setTableStatus(statuses);
    } catch (error) {
      errorHandler.handleError({
        message: 'Error checking realtime status',
        technical: error,
        severity: 'warning',
        code: 'REALTIME_CHECK_ERROR',
        actionable: true,
        retry: checkRealtimeStatus
      }, 'RealtimeStatus');
    } finally {
      setLoading(false);
    }
  };
  
  const enableRealtime = async () => {
    if (!isConnected) {
      errorHandler.handleError({
        message: 'Cannot enable realtime',
        technical: 'No database connection',
        severity: 'warning',
        code: 'REALTIME_ENABLE_OFFLINE'
      }, 'RealtimeStatus');
      return;
    }
    
    setEnabling(true);
    try {
      const results = await realtimeService.enableRealtimeForAllTables();
      const allSucceeded = results.every(result => result.success);
      
      if (allSucceeded) {
        toast.success('Realtime enabled for all tables', {
          description: 'Your application will now receive real-time updates',
        });
      } else {
        const failedTables = results.filter(r => !r.success).map(r => r.table).join(', ');
        errorHandler.handleError({
          message: 'Some tables failed to enable realtime',
          technical: `Failed tables: ${failedTables}`,
          severity: 'error',
          code: 'REALTIME_PARTIAL_FAILURE',
          actionable: true,
          retry: enableRealtime
        }, 'RealtimeStatus');
      }
      
      await checkRealtimeStatus();
    } catch (error) {
      errorHandler.handleError({
        message: 'Failed to enable realtime',
        technical: error,
        severity: 'error',
        code: 'REALTIME_ENABLE_ERROR',
        actionable: true,
        retry: enableRealtime
      }, 'RealtimeStatus');
    } finally {
      setEnabling(false);
    }
  };
  
  useEffect(() => {
    if (isConnected) {
      checkRealtimeStatus();
    }
  }, [isConnected]);
  
  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Realtime Status</CardTitle>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={checkRealtimeStatus}
            disabled={loading || !isConnected}
          >
            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
        <CardDescription>
          Check the real-time status of your database tables
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-2">
          {!isConnected && (
            <div className="text-center p-4 text-amber-600 bg-amber-50 rounded-md">
              <AlertCircle className="h-5 w-5 mx-auto mb-2" />
              <p>Cannot check realtime status while offline</p>
            </div>
          )}
          
          {isConnected && Object.keys(tableStatus).length > 0 ? (
            Object.entries(tableStatus).map(([table, enabled]) => (
              <div key={table} className="flex justify-between items-center">
                <span className="text-sm font-medium">{table}</span>
                {enabled ? (
                  <Badge className="bg-green-100 text-green-800 hover:bg-green-200">
                    <Zap className="h-3 w-3 mr-1" />
                    Realtime Enabled
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-amber-600 border-amber-300">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Not Enabled
                  </Badge>
                )}
              </div>
            ))
          ) : isConnected && loading ? (
            <div className="py-2 text-center text-muted-foreground">
              Checking status...
            </div>
          ) : isConnected ? (
            <div className="py-2 text-center text-muted-foreground">
              No status information available
            </div>
          ) : null}
        </div>
      </CardContent>
      
      <CardFooter>
        <Button 
          className="w-full" 
          onClick={enableRealtime}
          disabled={enabling || loading || !isConnected}
        >
          <Zap className="h-4 w-4 mr-2" />
          {enabling ? 'Enabling...' : 'Enable Realtime for All Tables'}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default RealtimeStatus;
