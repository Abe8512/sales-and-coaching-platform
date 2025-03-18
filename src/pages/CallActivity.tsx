import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "../components/layout/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { UserPlus, Phone, Clock, Activity, Users, User, TrendingUp, TrendingDown, AlertCircle } from "lucide-react";
import { DateRange } from "react-day-picker";
import CoachingAlerts from "@/components/CallAnalysis/CoachingAlerts";
import KeywordInsights from "@/components/CallAnalysis/KeywordInsights";
import DateRangeFilter from "@/components/CallAnalysis/DateRangeFilter";
import TeamFilterWrapper from "@/components/Performance/TeamFilterWrapper";
import { useCallMetricsStore } from "@/store/useCallMetricsStore";
import { useBulkUploadStore } from "@/store/useBulkUploadStore";
import { useRealTimeTeamMetrics, useRealTimeRepMetrics, TeamMetrics, RepMetrics } from "@/services/RealTimeMetricsService";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#0088FE', '#FF4F9A'];

const CallActivity = () => {
  const { user, isAdmin, isManager, getManagedUsers } = useAuth();
  const navigate = useNavigate();
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
  
  const [calls, setCalls] = useState<any[]>([]);
  
  useEffect(() => {
    if (!hasLoadedHistory) {
      loadUploadHistory();
    }
    
    updateCallsData();
  }, [hasLoadedHistory, selectedUser, filters, dateRange, repMetrics]);
  
  const updateCallsData = () => {
    const MOCK_CALLS = [
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
    
    const transcriptCalls = uploadHistory.map(transcript => ({
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
    const userCalls = {};
    
    calls.forEach(call => {
      if (!userCalls[call.userName]) {
        userCalls[call.userName] = 0;
      }
      userCalls[call.userName]++;
    });
    
    return Object.entries(userCalls).map(([name, count]) => ({
      name,
      calls: count
    }));
  };
  
  const getOutcomeStats = () => {
    const outcomes = {};
    
    calls.forEach(call => {
      if (!outcomes[call.outcome]) {
        outcomes[call.outcome] = 0;
      }
      outcomes[call.outcome]++;
    });
    
    return Object.entries(outcomes).map(([outcome, count]) => ({
      outcome,
      count,
      percentage: Math.round((count as number / calls.length) * 100)
    }));
  };
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) + 
           ' at ' + date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
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
      
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle>Team Performance Overview</CardTitle>
          <CardDescription>
            Real-time metrics from all calls and recordings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <Card className="bg-purple-50 dark:bg-purple-950/20">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Calls</p>
                    <h3 className="text-2xl font-bold mt-1">
                      {teamMetricsLoading ? '...' : teamMetrics.totalCalls + calls.length}
                    </h3>
                  </div>
                  <Phone className="h-8 w-8 text-neon-purple opacity-80" />
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-green-50 dark:bg-green-950/20">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Avg Sentiment</p>
                    <h3 className="text-2xl font-bold mt-1">
                      {teamMetricsLoading 
                        ? '...' 
                        : `${Math.round(teamMetrics.avgSentiment * 100)}%`}
                    </h3>
                  </div>
                  <Activity className="h-8 w-8 text-green-500 opacity-80" />
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-blue-50 dark:bg-blue-950/20">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Talk Ratio</p>
                    <h3 className="text-2xl font-bold mt-1">
                      {teamMetricsLoading 
                        ? '...' 
                        : `${Math.round(teamMetrics.avgTalkRatio.agent)}:${Math.round(teamMetrics.avgTalkRatio.customer)}`}
                    </h3>
                  </div>
                  <Clock className="h-8 w-8 text-neon-blue opacity-80" />
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-amber-50 dark:bg-amber-950/20">
              <CardContent className="p-6">
                <div className="flex flex-col">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-muted-foreground">Top Keywords</p>
                    <AlertCircle className="h-5 w-5 text-amber-500 opacity-80" />
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {teamMetricsLoading 
                      ? <p className="text-sm">Loading...</p>
                      : teamMetrics.topKeywords.length > 0 
                        ? teamMetrics.topKeywords.map((keyword, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {keyword}
                            </Badge>
                          ))
                        : <p className="text-sm">No keywords recorded</p>
                    }
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
      
      {(isAdmin || isManager) && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Individual Performance</CardTitle>
            <CardDescription>
              Performance metrics for individual team members
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {repMetricsLoading ? (
                <p>Loading representative data...</p>
              ) : repMetrics.length > 0 ? (
                repMetrics.map(rep => (
                  <Card key={rep.id} className="overflow-hidden">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">{rep.name}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Call Volume</span>
                          <span className="font-medium">{rep.callVolume}</span>
                        </div>
                        <Progress value={rep.callVolume / 2} className="h-1.5" />
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Success Rate</span>
                          <span className="font-medium">{rep.successRate}%</span>
                        </div>
                        <Progress value={rep.successRate} className="h-1.5" />
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Customer Sentiment</span>
                          <span className="font-medium">{Math.round(rep.sentiment * 100)}%</span>
                        </div>
                        <Progress value={rep.sentiment * 100} className="h-1.5" />
                      </div>
                      
                      <div>
                        <h4 className="text-sm font-medium mb-1">AI Insights</h4>
                        <ul className="text-sm space-y-1">
                          {rep.insights.map((insight, idx) => (
                            <li key={idx} className="flex items-start">
                              <div className="w-1.5 h-1.5 rounded-full bg-neon-purple mt-1.5 mr-2"></div>
                              {insight}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <p>No representative data available</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
      
      <Tabs defaultValue="calls" className="mb-6">
        <TabsList>
          <TabsTrigger value="calls">Calls List</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="outcomes">Outcomes</TabsTrigger>
          <TabsTrigger value="keywords">Keywords</TabsTrigger>
        </TabsList>
        
        <TabsContent value="calls" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Recent Calls</CardTitle>
              <CardDescription>
                {selectedUser 
                  ? `Showing calls for ${managedUsers.find(u => u.id === selectedUser)?.name || 'selected user'}`
                  : 'Showing all recent calls'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date & Time</TableHead>
                    {(isAdmin || isManager) && <TableHead>Rep</TableHead>}
                    <TableHead>Customer</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Outcome</TableHead>
                    <TableHead>Sentiment</TableHead>
                    <TableHead>Next Steps</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {calls.length > 0 ? (
                    calls.map((call) => (
                      <TableRow key={call.id}>
                        <TableCell>{formatDate(call.date)}</TableCell>
                        {(isAdmin || isManager) && <TableCell>{call.userName}</TableCell>}
                        <TableCell>{call.customerName}</TableCell>
                        <TableCell>{call.duration} min</TableCell>
                        <TableCell>{call.outcome ? String(call.outcome) : 'N/A'}</TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <div className="w-full bg-gray-200 rounded-full h-2 mr-2">
                              <div 
                                className={`h-2 rounded-full ${
                                  call.sentiment > 0.7 ? 'bg-green-500' : 
                                  call.sentiment > 0.4 ? 'bg-amber-500' : 'bg-red-500'
                                }`}
                                style={{ width: `${call.sentiment * 100}%` }}
                              ></div>
                            </div>
                            <span>{Math.round(call.sentiment * 100)}%</span>
                          </div>
                        </TableCell>
                        <TableCell>{call.nextSteps}</TableCell>
                        <TableCell>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => navigate(`/transcripts`)}
                          >
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={isAdmin || isManager ? 8 : 7} className="text-center py-8">
                        <p className="text-muted-foreground">No calls match the current filters</p>
                        <p className="text-sm mt-1">Try adjusting your filters or date range</p>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="analytics" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Call Distribution</CardTitle>
              <CardDescription>Number of calls per sales representative</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart 
                    data={getCallDistributionData()} 
                    margin={{ top: 20, right: 30, left: 20, bottom: 50 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar 
                      dataKey="calls" 
                      fill="#9333EA" 
                      name="Number of Calls" 
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="outcomes" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Call Outcomes</CardTitle>
                <CardDescription>Distribution of call results</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-4 mb-6">
                  {getOutcomeStats().map((stat) => (
                    <Card key={stat.outcome} className="bg-background">
                      <CardContent className="p-6">
                        <h3 className="font-medium text-muted-foreground">{stat.outcome}</h3>
                        <div className="flex items-center justify-between mt-2">
                          <p className="text-2xl font-bold">{stat.count}</p>
                          <p className="text-sm bg-muted rounded-full px-2 py-1">
                            {stat.percentage}%
                          </p>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                          <div 
                            className="bg-neon-purple h-2 rounded-full"
                            style={{ width: `${stat.percentage}%` }}
                          ></div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Outcome Distribution</CardTitle>
                <CardDescription>Visual breakdown of call outcomes</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={getOutcomeStats()}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="count"
                      >
                        {getOutcomeStats().map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value, name, props) => [`${value} calls`, props.payload.outcome]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
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
