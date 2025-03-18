
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { realtimeService } from '@/services/RealtimeService';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, Zap, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

const RealtimeStatus = () => {
  const [tableStatus, setTableStatus] = useState<{[key: string]: boolean}>({});
  const [loading, setLoading] = useState(false);
  const [enabling, setEnabling] = useState(false);
  
  const checkRealtimeStatus = async () => {
    setLoading(true);
    const tables = ['call_transcripts', 'calls', 'keyword_trends', 'sentiment_trends'];
    const statuses: {[key: string]: boolean} = {};
    
    for (const table of tables) {
      try {
        const result = await realtimeService.checkRealtimeEnabled(table);
        statuses[table] = result.enabled;
      } catch (error) {
        console.error(`Error checking realtime status for ${table}:`, error);
        statuses[table] = false;
      }
    }
    
    setTableStatus(statuses);
    setLoading(false);
  };
  
  const enableRealtime = async () => {
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
        toast.error('Some tables failed to enable realtime', {
          description: `Failed tables: ${failedTables}`,
        });
      }
      
      await checkRealtimeStatus();
    } catch (error) {
      console.error('Error enabling realtime:', error);
      toast.error('Failed to enable realtime', {
        description: 'Check console for details',
      });
    } finally {
      setEnabling(false);
    }
  };
  
  useEffect(() => {
    checkRealtimeStatus();
  }, []);
  
  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Realtime Status</CardTitle>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={checkRealtimeStatus}
            disabled={loading}
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
          {Object.keys(tableStatus).length > 0 ? (
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
          ) : (
            <div className="py-2 text-center text-muted-foreground">
              {loading ? 'Checking status...' : 'No status information available'}
            </div>
          )}
        </div>
      </CardContent>
      
      <CardFooter>
        <Button 
          className="w-full" 
          onClick={enableRealtime}
          disabled={enabling || loading}
        >
          <Zap className="h-4 w-4 mr-2" />
          {enabling ? 'Enabling...' : 'Enable Realtime for All Tables'}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default RealtimeStatus;
