import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { syncAllMetricsData } from '@/services/DataSyncService';
import { Database, RefreshCw, AlertTriangle, WifiOff, Check, BookOpen, Server, BarChart2, ShieldCheck } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { checkSupabaseConnection } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useRunMetricsHealthChecks, useMetricsHealth } from '@/hooks/useSupabase';

// Add an interface for the health data structure (match the view)
interface HealthCheckItem {
    check_type: string;
    issue_count: number;
    affected_metrics: string | null;
    max_deviation: number | null;
    last_checked: string | null;
}

const AdminToolbar = () => {
  const { toast } = useToast();
  const [isDbSetupLoading, setIsDbSetupLoading] = useState(false);
  const [isConnectionTestLoading, setIsConnectionTestLoading] = useState(false);
  const [isSyncingMetrics, setIsSyncingMetrics] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'online' | 'offline' | 'unknown'>('unknown');
  const [lastChecked, setLastChecked] = useState<string>('');
  const [isLoadingSchema, setIsLoadingSchema] = useState(false);
  const [isLoadingSync, setIsLoadingSync] = useState(false);
  const [isLoadingHealth, setIsLoadingHealth] = useState(false);

  const { runHealthChecks, running: healthCheckRunning, error: healthCheckError } = useRunMetricsHealthChecks();
  const { data: healthDataResult, loading: healthDataLoading, error: healthDataError } = useMetricsHealth();
  const healthData = healthDataResult as HealthCheckItem[] | null;

  const isCheckingHealth = isLoadingHealth || healthCheckRunning || healthDataLoading;
  const combinedHealthError = healthCheckError || healthDataError;

  useEffect(() => {
    // Check connection status on load
    testConnection();
    
    // Listen for database schema setup events
    const handleSchemaSetup = (event: CustomEvent) => {
      const { success, message } = event.detail;
      if (success) {
        toast({ 
            title: "Database Setup", 
            description: message || "Database schema setup completed successfully"
        });
      } else {
        toast({ 
            title: "Database Setup Warning", 
            description: message || "Database schema setup had issues, some features may be limited",
            variant: "default"
        });
      }
    };
    
    window.addEventListener('database-schema-setup-complete', handleSchemaSetup as EventListener);
    
    return () => {
      window.removeEventListener('database-schema-setup-complete', handleSchemaSetup as EventListener);
    };
  }, []);

  const setupDatabase = async () => {
    try {
      setIsDbSetupLoading(true);
      toast({ 
            title: "Database Setup", 
            description: "Starting database schema setup...",
            variant: "default"
      });
      
      // await ensureDatabaseSchema();
      console.warn("Manual schema check triggered from UI - This function is deprecated.")
      
      setIsDbSetupLoading(false);
      testConnection();
    } catch (error) {
      setIsDbSetupLoading(false);
      toast({ 
            title: "Database Setup Failed", 
            description: error instanceof Error ? error.message : "Unknown error occurred",
            variant: "destructive"
      });
      console.error("Database setup error:", error);
    }
  };
  
  const testConnection = async () => {
    try {
      setIsConnectionTestLoading(true);
      const isConnected = await checkSupabaseConnection();
      setConnectionStatus(isConnected ? 'online' : 'offline');
      setLastChecked(new Date().toLocaleTimeString());
      setIsConnectionTestLoading(false);
      
      if (isConnected) {
        toast({ 
            title: "Connection Test", 
            description: "Connection to database is working"
        });
      } else {
        toast({ 
            title: "Connection Test", 
            description: "Cannot connect to database. Check your network and database configuration.",
            variant: "destructive"
        });
      }
    } catch (error) {
      setConnectionStatus('offline');
      setIsConnectionTestLoading(false);
      setLastChecked(new Date().toLocaleTimeString());
      toast({ 
            title: "Connection Test Failed", 
            description: error instanceof Error ? error.message : "Unknown error occurred",
            variant: "destructive"
      });
      console.error("Connection test error:", error);
    }
  };

  const syncMetricsData = async () => {
    try {
      setIsSyncingMetrics(true);
      toast({ 
            title: "Metrics Sync", 
            description: "Starting metrics data synchronization..."
      });
      
      await syncAllMetricsData();
      
      setIsSyncingMetrics(false);
      toast({ 
            title: "Metrics Sync", 
            description: "Metrics data synchronized successfully"
      });
    } catch (error) {
      setIsSyncingMetrics(false);
      toast({ 
            title: "Metrics Sync Failed", 
            description: error instanceof Error ? error.message : "Unknown error occurred",
            variant: "destructive"
      });
      console.error("Metrics sync error:", error);
    }
  };

  const handleEnsureSchema = async () => {
    setIsLoadingSchema(true);
    try {
      toast({ 
            title: "Schema Check Deprecated", 
            description: "Manual schema checks from UI are disabled. Use migrations.", 
            variant: "default" 
      });
      console.warn("Manual schema check triggered from UI - This function is deprecated.")
    } catch (error) {
       toast({ 
           title: "Schema Check Failed", 
           description: error instanceof Error ? error.message : 'Unknown error', 
           variant: 'destructive' 
       });
    } finally {
      setIsLoadingSchema(false);
    }
  };

  const handleSyncMetricsButtonClick = async () => {
    setIsLoadingSync(true);
    try {
      const success = await syncAllMetricsData();
      if (success) {
        toast({ 
            title: "Metrics Sync Successful", 
            description: "Metrics have been recalculated and synced." 
        });
      } else {
         toast({ 
             title: "Metrics Sync Issues", 
             description: "Sync completed, but some issues occurred. Check logs.", 
             variant: "default"
         }); 
      }
    } catch (error) {
      toast({ 
          title: "Metrics Sync Failed", 
          description: error instanceof Error ? error.message : 'Unknown error', 
          variant: 'destructive' 
      });
    } finally {
      setIsLoadingSync(false);
    }
  };
  
  const handleRunHealthChecks = async () => {
    setIsLoadingHealth(true);
    try {
      await runHealthChecks(); 
      if (healthCheckError) {
           toast({ 
               title: "Health Check Failed", 
               description: healthCheckError.message, 
               variant: "destructive" 
           });
      } else {
           toast({ 
               title: "Health Checks Complete", 
               description: "Metrics consistency and anomaly checks finished." 
           });
      }
    } catch (error) {
       toast({ 
           title: "Health Check Error", 
           description: error instanceof Error ? error.message : 'Unknown error running checks', 
           variant: 'destructive' 
       });
    } finally {
      setIsLoadingHealth(false);
    }
  };

  // Determine overall health status for badge
  const healthStatus = healthDataLoading ? 'loading' : 
                       combinedHealthError ? 'error' : 
                       (Array.isArray(healthData) && healthData.some(d => d.issue_count > 0)) ? 'warning' : 'ok';
  const healthBadgeVariant = healthStatus === 'ok' ? 'success' : 
                             healthStatus === 'warning' ? 'warning' : 
                             healthStatus === 'error' ? 'destructive' : 'secondary';

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" /> Database Administration
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center mb-4 gap-2">
          <span>Connection Status:</span>
          {connectionStatus === 'online' && (
            <Badge variant="success" className="bg-green-500">
              <Check className="h-3 w-3 mr-1" /> Connected
            </Badge>
          )}
          {connectionStatus === 'offline' && (
            <Badge variant="destructive">
              <WifiOff className="h-3 w-3 mr-1" /> Disconnected
            </Badge>
          )}
          {connectionStatus === 'unknown' && (
            <Badge variant="outline">
              <AlertTriangle className="h-3 w-3 mr-1" /> Unknown
            </Badge>
          )}
          {lastChecked && <span className="text-xs text-muted-foreground ml-2">Last checked: {lastChecked}</span>}
        </div>
        
        {connectionStatus === 'offline' && (
          <Alert variant="destructive" className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Connection Issue</AlertTitle>
            <AlertDescription>
              Cannot connect to the database. This may be due to network issues or database configuration problems.
              Try clicking "Test Connection" again or "Setup Database Tables" to initialize the schema.
            </AlertDescription>
          </Alert>
        )}
        
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          <Button 
            onClick={setupDatabase} 
            disabled={isDbSetupLoading}
            className="flex items-center gap-2"
          >
            {isDbSetupLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Server className="h-4 w-4" />}
            <span>{isDbSetupLoading ? 'Setting up tables...' : 'Setup Database Tables'}</span>
          </Button>
          
          <Button 
            onClick={testConnection} 
            disabled={isConnectionTestLoading}
            variant="outline"
            className="flex items-center gap-2"
          >
            {isConnectionTestLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <WifiOff className="h-4 w-4" />}
            <span>{isConnectionTestLoading ? 'Testing...' : 'Test Connection'}</span>
          </Button>

          <Button 
            onClick={syncMetricsData} 
            disabled={isSyncingMetrics || connectionStatus !== 'online'}
            variant="secondary"
            className="flex items-center gap-2"
          >
            {isSyncingMetrics ? <RefreshCw className="h-4 w-4 animate-spin" /> : <BarChart2 className="h-4 w-4" />}
            <span>{isSyncingMetrics ? 'Syncing metrics...' : 'Sync Metrics Data'}</span>
          </Button>
        </div>
      </CardContent>
      <CardFooter className="text-xs text-muted-foreground flex items-center gap-1">
        <BookOpen className="h-3 w-3" /> Use these tools if you experience database connection issues or missing data.
      </CardFooter>
    </Card>
  );
};

export { AdminToolbar };
export default AdminToolbar; 