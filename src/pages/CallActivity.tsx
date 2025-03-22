import React, { useState, useEffect, useCallback, useMemo } from "react";
import DashboardLayout from "../components/layout/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCallMetricsStore } from "@/store/useCallMetricsStore";
import { useAnalyticsTeamMetrics, useAnalyticsRepMetrics, useAnalyticsTranscripts } from "@/services/AnalyticsHubService";
import DateRangeFilter from "@/components/CallAnalysis/DateRangeFilter";
import TeamFilterWrapper from "@/components/Performance/TeamFilterWrapper";
import CoachingAlerts from "@/components/CallAnalysis/CoachingAlerts";
import KeywordInsights from "@/components/CallAnalysis/KeywordInsights";
import { Button } from "@/components/ui/button";
import { DateRange } from "react-day-picker";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useEventListener } from '@/services/events';
import { EventType } from '@/services/events/types';
import { toast } from "sonner";
import TeamPerformanceOverview from "@/components/CallActivity/TeamPerformanceOverview";
import RepPerformanceCards from "@/components/CallActivity/RepPerformanceCards";
import RecentCallsTable from "@/components/CallActivity/RecentCallsTable";
import CallOutcomeStats from "@/components/CallActivity/CallOutcomeStats";
import { getMetrics, getCallDistributionData } from "@/services/CallTranscriptMetricsService";
import { useEventsStore } from '@/services/events';
import { useEventListener as useEventListenerHook } from '@/hooks/useEventListener';
import { Skeleton } from '@/components/ui/skeleton';

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
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [filters, setFilters] = useState({
    teamMembers: [] as string[],
    productLines: [] as string[],
    callTypes: [] as string[],
  });
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  // Use AnalyticsHubService hooks
  const { metrics: teamMetrics, isLoading: teamMetricsLoading, refreshMetrics: refreshTeamMetrics } = useAnalyticsTeamMetrics({
    dateRange,
    repIds: filters.teamMembers.length > 0 ? filters.teamMembers : undefined
  });
  
  const { metrics: repMetrics, isLoading: repMetricsLoading } = useAnalyticsRepMetrics({
    dateRange,
    repIds: filters.teamMembers.length > 0 ? filters.teamMembers : undefined
  });
  
  const { transcripts, isLoading: transcriptsLoading, refreshTranscripts, error: transcriptsError } = useAnalyticsTranscripts({
    dateRange,
    repIds: filters.teamMembers.length > 0 ? filters.teamMembers : undefined
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
  
  const refreshData = useCallback(() => {
    refreshTeamMetrics();
    refreshTranscripts();
    setRefreshTrigger(prev => prev + 1);
  }, [refreshTeamMetrics, refreshTranscripts]);
  
  useEventListener('bulk-upload-completed', (data) => {
    console.log('Bulk upload completed event received', data);
    toast.success(`${data?.count || 'Multiple'} files processed`, {
      description: "Refreshing call data..."
    });
    refreshData();
  });
  
  useEventListener('recording-completed', (data) => {
    console.log('Recording completed event received', data);
    toast.success('New recording added', {
      description: "Refreshing call data..."
    });
    refreshData();
  });
  
  useEffect(() => {
    refreshData();
    // this ensures the effect runs when any of the dependencies of refreshData change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedUser, filters, dateRange, refreshTeamMetrics, refreshTranscripts]);
  
  useEffect(() => {
    if (transcriptsError) {
      setFetchError(transcriptsError instanceof Error ? transcriptsError.message : String(transcriptsError));
      toast.error("Failed to load call data", {
        description: transcriptsError instanceof Error ? transcriptsError.message : String(transcriptsError),
      });
    } else {
      setFetchError(null);
    }
  }, [transcriptsError]);
  
  const handleRetry = useCallback(() => {
    setFetchError(null);
    refreshData();
  }, [refreshData]);
  
  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
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

  return (
    <DashboardLayout>
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
          <DateRangeFilter dateRange={dateRange} setDateRange={setDateRange} />
          
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
        teamMetrics={teamMetrics} 
        teamMetricsLoading={teamMetricsLoading || transcriptsLoading}
        callsLength={calls.length}
      />
      
      {(isAdmin || isManager) && (
        <RepPerformanceCards 
          repMetrics={repMetrics} 
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
          <RecentCallsTable 
            calls={calls} 
            isAdmin={isAdmin} 
            isManager={isManager}
            loading={transcriptsLoading}
          />
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
    </DashboardLayout>
  );
};

export default CallActivity;
