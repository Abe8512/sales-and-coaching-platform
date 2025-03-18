import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "../components/layout/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { UserPlus, Phone, Clock, Activity, Users, User } from "lucide-react";
import CoachingAlerts from "@/components/CallAnalysis/CoachingAlerts";
import KeywordInsights from "@/components/CallAnalysis/KeywordInsights";
import { useCallMetricsStore } from "@/store/useCallMetricsStore";

// Mock call data
const MOCK_CALLS = [
  {
    id: "call1",
    userId: "3",
    userName: "Sales Rep 1",
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

const CallActivity = () => {
  const { user, isAdmin, isManager, getManagedUsers } = useAuth();
  const navigate = useNavigate();
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const { isRecording } = useCallMetricsStore();
  
  // Get users based on role
  const managedUsers = getManagedUsers();
  
  // Get calls based on selected user or role
  const getCalls = () => {
    if (isAdmin) {
      return selectedUser 
        ? MOCK_CALLS.filter(call => call.userId === selectedUser)
        : MOCK_CALLS;
    }
    
    if (isManager) {
      const managedUserIds = managedUsers.map(u => u.id);
      return selectedUser 
        ? MOCK_CALLS.filter(call => call.userId === selectedUser)
        : MOCK_CALLS.filter(call => managedUserIds.includes(call.userId));
    }
    
    // For reps, only show their own calls
    return MOCK_CALLS.filter(call => call.userId === user?.id);
  };
  
  const filteredCalls = getCalls();
  
  // Prepare chart data
  const callsPerUser = filteredCalls.reduce((acc, call) => {
    acc[call.userName] = (acc[call.userName] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const chartData = Object.entries(callsPerUser).map(([name, count]) => ({
    name,
    calls: count
  }));
  
  const getOutcomeStats = () => {
    const outcomes = filteredCalls.reduce((acc, call) => {
      acc[call.outcome] = (acc[call.outcome] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return Object.entries(outcomes).map(([outcome, count]) => ({
      outcome,
      count,
      percentage: Math.round((count / filteredCalls.length) * 100)
    }));
  };
  
  const outcomeStats = getOutcomeStats();
  
  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) + 
           ' at ' + date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Call Activity</h1>
        <p className="text-muted-foreground">
          {isAdmin || isManager 
            ? "Monitor and analyze sales call activities across your team" 
            : "Monitor and analyze your sales call activities"}
        </p>
      </div>
      
      {/* Role-based controls */}
      {(isAdmin || isManager) && (
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle>Team Overview</CardTitle>
            <CardDescription>
              {isAdmin 
                ? "View call activity for all sales representatives" 
                : "View call activity for representatives in your teams"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3 mb-4">
              <Button 
                variant={selectedUser === null ? "default" : "outline"}
                className={selectedUser === null ? "bg-neon-purple" : ""}
                onClick={() => setSelectedUser(null)}
              >
                <Users className="mr-2 h-4 w-4" />
                All Representatives
              </Button>
              
              {managedUsers.map((managedUser) => (
                <Button
                  key={managedUser.id}
                  variant={selectedUser === managedUser.id ? "default" : "outline"}
                  className={selectedUser === managedUser.id ? "bg-neon-purple" : ""}
                  onClick={() => setSelectedUser(managedUser.id)}
                >
                  <User className="mr-2 h-4 w-4" />
                  {managedUser.name}
                </Button>
              ))}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              <Card className="bg-purple-50 dark:bg-purple-950/20">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Total Calls</p>
                      <h3 className="text-2xl font-bold mt-1">{filteredCalls.length}</h3>
                    </div>
                    <Phone className="h-8 w-8 text-neon-purple opacity-80" />
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-blue-50 dark:bg-blue-950/20">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Avg Duration</p>
                      <h3 className="text-2xl font-bold mt-1">
                        {(filteredCalls.reduce((sum, call) => sum + call.duration, 0) / filteredCalls.length).toFixed(1)} min
                      </h3>
                    </div>
                    <Clock className="h-8 w-8 text-neon-blue opacity-80" />
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-green-50 dark:bg-green-950/20">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Avg Sentiment</p>
                      <h3 className="text-2xl font-bold mt-1">
                        {(filteredCalls.reduce((sum, call) => sum + call.sentiment, 0) / filteredCalls.length * 100).toFixed(0)}%
                      </h3>
                    </div>
                    <Activity className="h-8 w-8 text-green-500 opacity-80" />
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-amber-50 dark:bg-amber-950/20">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Representatives</p>
                      <h3 className="text-2xl font-bold mt-1">
                        {Object.keys(callsPerUser).length}
                      </h3>
                    </div>
                    <UserPlus className="h-8 w-8 text-amber-500 opacity-80" />
                  </div>
                </CardContent>
              </Card>
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
                  {filteredCalls.map((call) => (
                    <TableRow key={call.id}>
                      <TableCell>{formatDate(call.date)}</TableCell>
                      {(isAdmin || isManager) && <TableCell>{call.userName}</TableCell>}
                      <TableCell>{call.customerName}</TableCell>
                      <TableCell>{call.duration} min</TableCell>
                      <TableCell>{call.outcome}</TableCell>
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
                  ))}
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
                  <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 50 }}>
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
          <Card>
            <CardHeader>
              <CardTitle>Call Outcomes</CardTitle>
              <CardDescription>Distribution of call results</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                {outcomeStats.map((stat) => (
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
