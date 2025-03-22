import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw, DatabaseIcon, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from '@/hooks/use-toast';

interface TableInfo {
  name: string;
  rowCount: number;
  exists: boolean;
  error?: string;
}

export const DataAudit = () => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [lastChecked, setLastChecked] = useState<string>('');
  const [dataError, setDataError] = useState<string | null>(null);

  const checkTables = async () => {
    try {
      setIsLoading(true);
      setDataError(null);
      
      // Define expected tables
      const expectedTables = [
        'calls',
        'call_transcripts',
        'call_metrics_summary',
        'rep_metrics_summary',
        'team_members',
        'keyword_trends',
        'sentiment_trends'
      ];
      
      // Check each table
      const tableInfoPromises = expectedTables.map(async (tableName) => {
        try {
          // First check if table exists
          const { data: tableExists, error: tableExistsError } = await supabase
            .from(tableName)
            .select('count(*)', { count: 'exact', head: true });
          
          if (tableExistsError) {
            if (tableExistsError.message.includes('does not exist')) {
              return {
                name: tableName,
                rowCount: 0,
                exists: false
              };
            }
            
            return {
              name: tableName,
              rowCount: 0,
              exists: false,
              error: tableExistsError.message
            };
          }
          
          // If we get here, table exists, get row count
          const { count, error: countError } = await supabase
            .from(tableName)
            .select('*', { count: 'exact', head: true });
          
          if (countError) {
            return {
              name: tableName,
              rowCount: 0,
              exists: true,
              error: countError.message
            };
          }
          
          return {
            name: tableName,
            rowCount: count || 0,
            exists: true
          };
        } catch (err) {
          return {
            name: tableName,
            rowCount: 0,
            exists: false,
            error: err instanceof Error ? err.message : 'Unknown error'
          };
        }
      });
      
      const tableInfos = await Promise.all(tableInfoPromises);
      setTables(tableInfos);
      setLastChecked(new Date().toLocaleTimeString());
      
      // Check for potential data issues
      const callsTable = tableInfos.find(t => t.name === 'calls');
      const transcriptsTable = tableInfos.find(t => t.name === 'call_transcripts');
      const callMetricsTable = tableInfos.find(t => t.name === 'call_metrics_summary');
      const repMetricsTable = tableInfos.find(t => t.name === 'rep_metrics_summary');
      
      // Check for sync issues
      if (callsTable?.exists && transcriptsTable?.exists) {
        if (callsTable.rowCount > 0 && callMetricsTable && callMetricsTable.rowCount === 0) {
          setDataError("There are calls in the database but no metrics have been generated. Try using the 'Sync Metrics Data' button to fix this.");
        }
      }
      
      toast.success("Data Audit Complete", {
        description: "Checked " + tableInfos.length + " tables"
      });
    } catch (error) {
      console.error("Error auditing data:", error);
      setDataError(error instanceof Error ? error.message : "Unknown error occurred");
      toast.error("Data Audit Failed", {
        description: error instanceof Error ? error.message : "Unknown error occurred"
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  useEffect(() => {
    // Run audit on mount
    checkTables();
  }, []);
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DatabaseIcon className="h-5 w-5" /> Data Audit
        </CardTitle>
      </CardHeader>
      <CardContent>
        {dataError && (
          <Alert variant="warning" className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Data Issue Detected</AlertTitle>
            <AlertDescription>{dataError}</AlertDescription>
          </Alert>
        )}
        
        <div className="mb-4">
          <h3 className="text-lg font-medium mb-2">Database Tables</h3>
          <div className="relative overflow-x-auto rounded-md border">
            <table className="w-full text-sm text-left">
              <thead className="text-xs uppercase bg-muted">
                <tr>
                  <th scope="col" className="px-4 py-2">Table Name</th>
                  <th scope="col" className="px-4 py-2">Status</th>
                  <th scope="col" className="px-4 py-2">Row Count</th>
                </tr>
              </thead>
              <tbody>
                {tables.map(table => (
                  <tr key={table.name} className="border-b">
                    <td className="px-4 py-2 font-medium">{table.name}</td>
                    <td className="px-4 py-2">
                      {table.exists ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                          Exists
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                          Missing
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2">{table.rowCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {lastChecked && <p className="text-xs text-muted-foreground mt-2">Last checked: {lastChecked}</p>}
        </div>
        
        <div className="flex justify-end mt-4">
          <Button 
            onClick={checkTables} 
            disabled={isLoading}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            {isLoading ? <RefreshCw className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
            <span>{isLoading ? 'Checking...' : 'Refresh Audit'}</span>
          </Button>
        </div>
      </CardContent>
      <CardFooter className="text-xs text-muted-foreground">
        This tool helps you understand the state of your database and identify sync issues.
      </CardFooter>
    </Card>
  );
};

export default DataAudit; 