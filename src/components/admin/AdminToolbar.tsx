import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { ensureDatabaseSchema } from '@/services/SqlUtilService';
import { syncAllMetricsData } from '@/services/DataSyncService';
import { Database, RefreshCw, AlertTriangle, WifiOff, Check, BookOpen, Server, BarChart2 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { checkSupabaseConnection } from '@/integrations/supabase/client';
import { toast } from "sonner";

const AdminToolbar = () => {
  const [isDbSetupLoading, setIsDbSetupLoading] = useState(false);
  const [isConnectionTestLoading, setIsConnectionTestLoading] = useState(false);
  const [isSyncingMetrics, setIsSyncingMetrics] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'online' | 'offline' | 'unknown'>('unknown');
  const [lastChecked, setLastChecked] = useState<string>('');

  useEffect(() => {
    // Check connection status on load
    testConnection();
    
    // Listen for database schema setup events
    const handleSchemaSetup = (event: CustomEvent) => {
      const { success, message } = event.detail;
      if (success) {
        toast.success("Database Setup", {
          description: message || "Database schema setup completed successfully"
        });
      } else {
        toast.warning("Database Setup", {
          description: message || "Database schema setup had issues, some features may be limited"
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
      toast.info("Database Setup", {
        description: "Starting database schema setup..."
      });
      
      await ensureDatabaseSchema();
      
      setIsDbSetupLoading(false);
      testConnection();
    } catch (error) {
      setIsDbSetupLoading(false);
      toast.error("Database Setup Failed", {
        description: error instanceof Error ? error.message : "Unknown error occurred"
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
        toast.success("Connection Test", {
          description: "Connection to database is working"
        });
      } else {
        toast.error("Connection Test", {
          description: "Cannot connect to database. Check your network and database configuration."
        });
      }
    } catch (error) {
      setConnectionStatus('offline');
      setIsConnectionTestLoading(false);
      setLastChecked(new Date().toLocaleTimeString());
      toast.error("Connection Test Failed", {
        description: error instanceof Error ? error.message : "Unknown error occurred"
      });
      console.error("Connection test error:", error);
    }
  };

  const syncMetricsData = async () => {
    try {
      setIsSyncingMetrics(true);
      toast.info("Metrics Sync", {
        description: "Starting metrics data synchronization..."
      });
      
      await syncAllMetricsData();
      
      setIsSyncingMetrics(false);
      toast.success("Metrics Sync", {
        description: "Metrics data synchronized successfully"
      });
    } catch (error) {
      setIsSyncingMetrics(false);
      toast.error("Metrics Sync Failed", {
        description: error instanceof Error ? error.message : "Unknown error occurred"
      });
      console.error("Metrics sync error:", error);
    }
  };

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