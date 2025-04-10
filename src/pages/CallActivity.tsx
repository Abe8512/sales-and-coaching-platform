import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCallMetricsStore } from "@/store/useCallMetricsStore";
import { useAnalyticsDailyMetrics, useAnalyticsRepMetrics, useAnalyticsTranscripts } from "@/services/AnalyticsHubService";
import DateRangeFilter from "../components/CallAnalysis/DateRangeFilter";
import TeamFilterWrapper from "@/components/Performance/TeamFilterWrapper";
import CoachingAlerts from "@/components/CallAnalysis/CoachingAlerts";
import KeywordInsights from "@/components/CallAnalysis/KeywordInsights";
import { Button } from "@/components/ui/button";
import { DateRange } from "react-day-picker";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useEventListener } from '@/services/events';
import { toast } from "sonner";
import TeamPerformanceOverview from "@/components/CallActivity/TeamPerformanceOverview";
import RepPerformanceCards from "@/components/CallActivity/RepPerformanceCards";
import RecentCallsTable from "@/components/CallActivity/RecentCallsTable";
import CallOutcomeStats from "@/components/CallActivity/CallOutcomeStats";
import { getMetrics, getCallDistributionData } from "@/services/CallTranscriptMetricsService";
import { useEventsStore } from '@/services/events';
import { Skeleton } from '@/components/ui/skeleton';
import { Transcript, TranscriptFilter } from "@/services/repositories/TranscriptsRepository";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Activity, AlertCircle } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from 'date-fns';
import { Badge } from "@/components/ui/badge";

// Define local Call interface instead of importing from types
interface Call {
  id: string;
  userId: string;
  userName: string;
  date: string;
  duration: number;
  customerName: string;
  outcome: string;
  sentiment: number;
  nextSteps: string;
}

const CallActivity = () => {
  const { user, isAdmin, isManager, getManagedUsers } = useAuth();
  const { isRecording } = useCallMetricsStore();
  
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [filters, setFilters] = useState<TranscriptFilter>({});
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  
  // Use AnalyticsHubService hooks
  const {
    metrics: dailyMetrics, 
    isLoading: dailyMetricsLoading, 
    error: dailyMetricsError, 
    refreshMetrics: refreshDailyMetrics 
  } = useAnalyticsDailyMetrics({ 
      dateRange: { 
          from: dateRange?.from?.toISOString().split('T')[0], 
          to: dateRange?.to?.toISOString().split('T')[0] 
      }
  });
  
  const { 
    metrics: repMetrics, 
    isLoading: repMetricsLoading, 
    error: repMetricsError,
    refreshMetrics: refreshRepMetrics
  } = useAnalyticsRepMetrics({ 
      dateRange: { 
          from: dateRange?.from?.toISOString().split('T')[0], 
          to: dateRange?.to?.toISOString().split('T')[0] 
      }
  });

  const { 
    transcripts, 
    isLoading: transcriptsLoading, 
    error: transcriptsError, 
    refreshTranscripts
  } = useAnalyticsTranscripts({
      ...filters,
      startDate: dateRange?.from?.toISOString().split('T')[0],
      endDate: dateRange?.to?.toISOString().split('T')[0]
  });
  
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [calls, setCalls] = useState<Call[]>([]);
  
  const convertTranscriptsToCallData = (transcripts: any[]): Call[] => {
    if (!transcripts || transcripts.length === 0) {
      return [] as Call[];
    }
    
    const convertedCalls = transcripts.map(transcript => {
      const filenameBase = transcript.filename?.split('.')[0] || '';
      const customerName = filenameBase.includes('_') 
        ? filenameBase.split('_')[1] 
        : `Customer ${transcript.id.substring(0, 5)}`;
      
      const outcome = transcript.sentiment === 'positive' ? "Qualified Lead" : 
                    transcript.sentiment === 'negative' ? "No Interest" : "Follow-up Required";
      
      const sentimentValue = transcript.sentiment === 'positive' ? 0.8 : 
                            transcript.sentiment === 'negative' ? 0.3 : 0.6;
      
      const nextSteps = outcome === "Qualified Lead" ? "Schedule demo" : 
                      outcome === "No Interest" ? "No action required" : "Send additional information";
      
      return {
        id: transcript.id,
        userId: transcript.user_id || user?.id || "unknown",
        userName: getManagedUsers().find(u => u.id === transcript.user_id)?.name || user?.name || "Current User",
        date: transcript.created_at || new Date().toISOString(),
        duration: transcript.duration || 0,
        customerName,
        outcome,
        sentiment: sentimentValue,
        nextSteps
      };
    });
    
    return convertedCalls;
  };

  useEffect(() => {
    if (transcripts && transcripts.length > 0) {
      const convertedCalls = convertTranscriptsToCallData(transcripts);
      setCalls(convertedCalls);
    }
  }, [transcripts]);
  
  const handleRefreshAll = useCallback(() => {
    refreshDailyMetrics();
    refreshRepMetrics();
    refreshTranscripts();
  }, [refreshDailyMetrics, refreshRepMetrics, refreshTranscripts]);
  
  useEventListener('bulk-upload-completed', (data) => {
    console.log('Bulk upload completed event received', data);
    toast.success(`${data?.count || 'Multiple'} files processed`, {
      description: "Refreshing call data..."
    });
    handleRefreshAll();
  });
  
  useEventListener('recording-completed', (data) => {
    console.log('Recording completed event received', data);
    toast.success('New recording added', {
      description: "Refreshing call data..."
    });
    handleRefreshAll();
  });
  
  useEffect(() => {
    handleRefreshAll();
  }, [selectedUser, filters, refreshDailyMetrics, refreshTranscripts]);
  
  useEffect(() => {
    const combinedError = dailyMetricsError || repMetricsError || transcriptsError;
    if (combinedError) {
      const errorMsg = combinedError instanceof Error ? combinedError.message : String(combinedError);
      setFetchError(errorMsg);
    } else {
      setFetchError(null);
    }
  }, [dailyMetricsError, repMetricsError, transcriptsError]);
  
  const handleRetry = useCallback(() => {
    setFetchError(null);
    handleRefreshAll();
  }, [handleRefreshAll]);
  
  const handleFilterChange = (newFilters: Partial<Omit<TranscriptFilter, 'startDate' | 'endDate'>>) => {
    setFilters(prev => ({...prev, ...newFilters}));
  };

  // Convert outcome stats to the format expected by CallOutcomeStats
  const getFormattedMetrics = useCallback(() => {
    const rawMetrics = getMetrics(transcripts);
    return rawMetrics.outcomeStats.filter(outcome => outcome.outcome !== 'Total');
  }, [transcripts]);

  // Convert call distribution data to the format expected by CallOutcomeStats
  const getFormattedDistributionData = useCallback(() => {
    const rawData = getCallDistributionData(transcripts);
    return rawData.map(item => ({
      name: item.name,
      calls: item.calls
    }));
  }, [transcripts]);

  // Memoize the formatted metrics data
  const formattedMetrics = useMemo(() => getFormattedMetrics(), [getFormattedMetrics]);
  
  // Memoize the formatted distribution data
  const formattedDistributionData = useMemo(() => getFormattedDistributionData(), [getFormattedDistributionData]);

  // Combine loading states
  const isLoading = dailyMetricsLoading || repMetricsLoading || transcriptsLoading;

  // Use the existing 'calls' state which is derived from transcripts
  const callsToDisplay = calls;

  // Helper to format duration
  const formatDuration = (seconds: number): string => {
    if (isNaN(seconds) || seconds < 0) return "0:00";
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Helper for sentiment badge variant
  const getSentimentVariant = (sentiment: number): "default" | "destructive" | "outline" | "secondary" => {
    if (sentiment > 0.7) return "secondary"; // Use secondary for positive (like green)
    if (sentiment < 0.4) return "destructive"; // Use destructive for negative (like red)
    return "outline"; // Use outline for neutral
  };

  return (
    <>
      <div className="mb-4">
        <h1 className="text-3xl font-bold mb-2">Call Activity</h1>
        <p className="text-muted-foreground">
          {isAdmin || isManager 
            ? "Monitor and analyze sales call activities across your team" 
            : "Monitor and analyze your sales call activities"}
        </p>
      </div>
      
      {fetchError && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4 rounded shadow-md">
          <div className="flex items-center">
            <div className="py-1">
              <svg className="h-6 w-6 text-red-500 mr-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <p className="font-bold">Error loading call data</p>
              <p className="text-sm">{fetchError}</p>
            </div>
            <div className="ml-auto">
              <button 
                onClick={handleRetry}
                className="bg-red-500 hover:bg-red-700 text-white font-bold py-1 px-3 rounded text-sm"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      )}
      
      <div className="mb-6 space-y-4">
        <div className="flex flex-wrap gap-4 items-center justify-between">
          <DateRangePicker date={dateRange} setDate={setDateRange} />
          
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => setDateRange(undefined)}
              disabled={!dateRange}
            >
              Clear Dates
            </Button>
          </div>
        </div>
        
        {(isAdmin || isManager) && (
          <TeamFilterWrapper onFilterChange={handleFilterChange} />
        )}
      </div>
      
      <TeamPerformanceOverview 
        teamMetrics={dailyMetrics as any} 
        teamMetricsLoading={dailyMetricsLoading || transcriptsLoading}
        callsLength={calls.length}
      />
      
      {(isAdmin || isManager) && (
        <RepPerformanceCards 
          repMetrics={repMetrics as any} 
          repMetricsLoading={repMetricsLoading} 
        />
      )}
      
      <Tabs defaultValue="calls" className="mb-6">
        <TabsList>
          <TabsTrigger value="calls">Calls List</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="keywords">Keywords</TabsTrigger>
        </TabsList>
        
        <TabsContent value="calls" className="mt-6">
          <Card>
            <CardHeader><CardTitle>Calls List</CardTitle></CardHeader>
            <CardContent>
              {transcriptsLoading ? (
                 <Skeleton className="h-[200px] w-full" />
              ) : callsToDisplay.length > 0 ? (
                 <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>User</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Duration</TableHead>
                        <TableHead>Sentiment</TableHead>
                        <TableHead>Outcome</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {callsToDisplay.map((call) => (
                        <TableRow key={call.id}>
                          <TableCell>{format(new Date(call.date), 'Pp')}</TableCell>
                          <TableCell>{call.userName}</TableCell>
                          <TableCell>{call.customerName}</TableCell>
                          <TableCell>{formatDuration(call.duration)}</TableCell>
                          <TableCell>
                             <Badge variant={getSentimentVariant(call.sentiment)}>
                                {call.sentiment > 0.7 ? 'Positive' : call.sentiment < 0.4 ? 'Negative' : 'Neutral'}
                             </Badge>
                          </TableCell>
                          <TableCell>{call.outcome}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                 </Table>
              ) : (
                 <p className="text-muted-foreground text-center py-8">
                    No call data available for the selected period.
                 </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="analytics" className="mt-6">
          <CallOutcomeStats 
            outcomeStats={formattedMetrics} 
            callDistributionData={formattedDistributionData} 
          />
        </TabsContent>
        
        <TabsContent value="keywords" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Keyword Insights</CardTitle>
              <CardDescription>Keywords categorized by sentiment</CardDescription>
            </CardHeader>
            <CardContent>
              <KeywordInsights />
              {!isRecording && (
                <p className="text-center text-muted-foreground mt-4">
                  Start a recording to see real-time keyword insights
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      <CoachingAlerts />
    </>
  );
};

export default CallActivity;