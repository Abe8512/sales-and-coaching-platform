
import React, { useState, useEffect } from "react";
import DashboardLayout from "../components/layout/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCallMetricsStore } from "@/store/useCallMetricsStore";
import { useBulkUploadStore } from "@/store/useBulkUploadStore";
import { useRealTimeTeamMetrics, useRealTimeRepMetrics } from "@/services/RealTimeMetricsService";
import DateRangeFilter from "@/components/CallAnalysis/DateRangeFilter";
import TeamFilterWrapper from "@/components/Performance/TeamFilterWrapper";
import CoachingAlerts from "@/components/CallAnalysis/CoachingAlerts";
import KeywordInsights from "@/components/CallAnalysis/KeywordInsights";
import { Button } from "@/components/ui/button";
import { DateRange } from "react-day-picker";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

// Import the new components
import TeamPerformanceOverview from "@/components/CallActivity/TeamPerformanceOverview";
import RepPerformanceCards from "@/components/CallActivity/RepPerformanceCards";
import RecentCallsTable from "@/components/CallActivity/RecentCallsTable";
import CallOutcomeStats from "@/components/CallActivity/CallOutcomeStats";

// Define call interface for strong typing
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
  const { uploadHistory, hasLoadedHistory, loadUploadHistory } = useBulkUploadStore();
  
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [filters, setFilters] = useState({
    teamMembers: [] as string[],
    productLines: [] as string[],
    callTypes: [] as string[],
  });
  
  const [teamMetrics, teamMetricsLoading] = useRealTimeTeamMetrics();
  const [repMetrics, repMetricsLoading] = useRealTimeRepMetrics(
    filters.teamMembers.length > 0 ? filters.teamMembers : undefined
  );
  
  const [calls, setCalls] = useState<Call[]>([]);
  
  useEffect(() => {
    if (!hasLoadedHistory) {
      loadUploadHistory();
    }
    
    updateCallsData();
  }, [hasLoadedHistory, selectedUser, filters, dateRange, repMetrics]);
  
  const updateCallsData = () => {
    const MOCK_CALLS: Call[] = [
      {
        id: "call1",
        userId: "3",
        userName: "David Kim",
        date: "2023-05-12T10:30:00",
        duration: 14.5,
        customerName: "Acme Inc.",
        outcome: "Qualified Lead",
        sentiment: 0.78,
        nextSteps: "Follow up with quote",
      },
      {
        id: "call2",
        userId: "3",
        userName: "Sales Rep 1",
        date: "2023-05-10T13:45:00",
        duration: 9.2,
        customerName: "TechGiant Corp",
        outcome: "No Interest",
        sentiment: 0.32,
        nextSteps: "No follow up needed",
      },
      {
        id: "call3",
        userId: "4",
        userName: "Sales Rep 2",
        date: "2023-05-11T15:00:00",
        duration: 18.3,
        customerName: "StartUp.io",
        outcome: "Meeting Scheduled",
        sentiment: 0.85,
        nextSteps: "Prepare demo for next week",
      },
      {
        id: "call4",
        userId: "5",
        userName: "Sales Rep 3",
        date: "2023-05-12T09:15:00",
        duration: 11.7,
        customerName: "Global Systems Inc.",
        outcome: "Request for Proposal",
        sentiment: 0.67,
        nextSteps: "Draft proposal by Friday",
      },
    ];
    
    const transcriptCalls: Call[] = uploadHistory.map(transcript => ({
      id: transcript.id,
      userId: user?.id || "1",
      userName: user?.name || "Current User",
      date: transcript.created_at || new Date().toISOString(),
      duration: transcript.duration || Math.floor(Math.random() * 15) + 5,
      customerName: `Customer ${transcript.id.substring(0, 5)}`,
      outcome: transcript.sentiment === 'positive' ? "Qualified Lead" : 
               transcript.sentiment === 'negative' ? "No Interest" : "Follow-up Required",
      sentiment: transcript.sentiment === 'positive' ? 0.8 : 
                 transcript.sentiment === 'negative' ? 0.3 : 0.6,
      nextSteps: transcript.sentiment === 'positive' ? "Schedule demo" : 
                 transcript.sentiment === 'negative' ? "No action required" : "Send additional information",
    }));
    
    let combinedCalls = [...MOCK_CALLS, ...transcriptCalls];
    
    if (selectedUser) {
      combinedCalls = combinedCalls.filter(call => call.userId === selectedUser);
    } else if (filters.teamMembers.length > 0) {
      combinedCalls = combinedCalls.filter(call => filters.teamMembers.includes(call.userId));
    }
    
    if (dateRange?.from) {
      const fromDate = new Date(dateRange.from);
      fromDate.setHours(0, 0, 0, 0);
      
      combinedCalls = combinedCalls.filter(call => {
        const callDate = new Date(call.date);
        if (dateRange.to) {
          const toDate = new Date(dateRange.to);
          toDate.setHours(23, 59, 59, 999);
          return callDate >= fromDate && callDate <= toDate;
        }
        return callDate >= fromDate;
      });
    }
    
    setCalls(combinedCalls);
  };
  
  const managedUsers = getManagedUsers();
  
  const getCallDistributionData = () => {
    const userCalls: Record<string, number> = {};
    
    calls.forEach(call => {
      if (!userCalls[call.userName]) {
        userCalls[call.userName] = 0;
      }
      userCalls[call.userName]++;
    });
    
    return Object.entries(userCalls).map(([name, count]) => ({
      name,
      calls: count as number
    }));
  };
  
  const getOutcomeStats = () => {
    const outcomes: Record<string, number> = {};
    
    calls.forEach(call => {
      if (!outcomes[call.outcome]) {
        outcomes[call.outcome] = 0;
      }
      outcomes[call.outcome]++;
    });
    
    return Object.entries(outcomes).map(([outcome, count]) => ({
      outcome,
      count: count as number,
      percentage: Math.round((count as number / calls.length) * 100)
    }));
  };

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
  };

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
        teamMetricsLoading={teamMetricsLoading}
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
          <TabsTrigger value="outcomes">Outcomes</TabsTrigger>
          <TabsTrigger value="keywords">Keywords</TabsTrigger>
        </TabsList>
        
        <TabsContent value="calls" className="mt-6">
          <RecentCallsTable 
            calls={calls} 
            isAdmin={isAdmin} 
            isManager={isManager} 
          />
        </TabsContent>
        
        <TabsContent value="analytics" className="mt-6">
          <CallOutcomeStats 
            outcomeStats={getOutcomeStats()} 
            callDistributionData={getCallDistributionData()} 
          />
        </TabsContent>
        
        <TabsContent value="outcomes" className="mt-6">
          <CallOutcomeStats 
            outcomeStats={getOutcomeStats()} 
            callDistributionData={getCallDistributionData()} 
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
