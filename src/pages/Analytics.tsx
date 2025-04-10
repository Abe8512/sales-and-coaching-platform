import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Download, Filter, RefreshCw, FileDown, Settings, BarChart, LineChart, PieChart, TrendingUp, Activity, Users, AlertTriangle } from "lucide-react";
import { DateRangePicker } from "../components/ui/date-range-picker";
import { useAnalyticsDailyMetrics, useAnalyticsRepMetrics, useAnalyticsSentimentTrends } from "../services/AnalyticsHubService";
import { useToast } from "../hooks/use-toast";
import TeamFilterWrapper from "../components/Performance/TeamFilterWrapper";
import { DateRange } from 'react-day-picker';
import { Skeleton } from '../components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from "../components/ui/alert";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "../components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { ResponsiveContainer, LineChart as RechartsLineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RepPerformanceData, SentimentData } from "@/services/repositories/AnalyticsRepository";

const AnalyticsSentimentChart = ({ data }: { data: SentimentData[] | null }) => {
  if (!data || data.length === 0) {
    return <p className="text-muted-foreground text-center py-8">No sentiment data available.</p>;
  }
  const chartData = data.map(d => ({ ...d, date: d.date.toString().split('T')[0] })); 

  return (
    <ResponsiveContainer width="100%" height={300}>
      <RechartsLineChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" />
        <YAxis domain={[0, 1]} /> 
        <Tooltip />
        <Line type="monotone" dataKey="sentiment_score" name="Avg Sentiment" stroke="#8884d8" dot={false} connectNulls/>
      </RechartsLineChart>
    </ResponsiveContainer>
  );
};

const RepLeaderboardTable = ({ data }: { data: RepPerformanceData[] | null }) => {
  if (!data || data.length === 0) {
    return <p className="text-muted-foreground text-center py-8">No representative performance data available.</p>;
  }
  const sortedData = [...data].sort((a, b) => (b.avg_score ?? 0) - (a.avg_score ?? 0));

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Rank</TableHead>
          <TableHead>Representative</TableHead>
          <TableHead>Avg Score</TableHead>
          <TableHead>Total Calls</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sortedData.map((rep, index) => (
          <TableRow key={rep.rep_id}>
            <TableCell>{index + 1}</TableCell>
            <TableCell>{rep.rep_name}</TableCell>
            <TableCell>{rep.avg_score?.toFixed(1) ?? 'N/A'}</TableCell>
            <TableCell>{rep.total_calls ?? 0}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

const Analytics: React.FC = () => {
  const { toast } = useToast();
  const [filters, setFilters] = useState<{
    repIds?: string[];
  }>({});
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [activeTab, setActiveTab] = useState("overview");
  const [timeFrame, setTimeFrame] = useState("week");

  const {
    metrics: dailyMetrics,
    isLoading: dailyMetricsLoading,
    error: dailyMetricsError,
    refreshMetrics: refreshDailyMetrics
  } = useAnalyticsDailyMetrics({ dateRange: { from: dateRange?.from?.toISOString().split('T')[0], to: dateRange?.to?.toISOString().split('T')[0] } });

  const {
    metrics: repMetrics,
    isLoading: repMetricsLoading,
    error: repMetricsError,
    refreshMetrics: refreshRepMetrics
  } = useAnalyticsRepMetrics({ dateRange: { from: dateRange?.from?.toISOString().split('T')[0], to: dateRange?.to?.toISOString().split('T')[0] }, repIds: filters.repIds });

  const calculateTimePeriod = (range?: DateRange): string => {
      if (!range?.from || !range?.to) return '30d';
      const diffTime = Math.abs(range.to.getTime() - range.from.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
      if (diffDays <= 7) return '7d';
      if (diffDays <= 30) return '30d';
      if (diffDays <= 90) return '90d';
      return 'all';
  };
  const calculatedTimePeriod = calculateTimePeriod(dateRange);

  const { 
    data: sentimentData, 
    isLoading: sentimentLoading, 
    error: sentimentError,
    refreshData: refreshSentiment 
  } = useAnalyticsSentimentTrends(calculatedTimePeriod);

  const isLoading = dailyMetricsLoading || repMetricsLoading || sentimentLoading;
  const error = dailyMetricsError || repMetricsError || sentimentError;

  const handleRefresh = () => {
    refreshDailyMetrics();
    refreshRepMetrics();
    if (refreshSentiment) refreshSentiment();
    toast({
      title: "Data Refreshed",
      description: "Analytics metrics updated with latest data",
    });
  };
  
  const handleExport = (format: string) => {
    toast({
      title: "Report Exported",
      description: `Analytics report has been downloaded as ${format}`,
    });
  };

  const handleFilterChange = (newFilters: Partial<typeof filters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  const handleDateChange = (range: DateRange | undefined) => {
    setDateRange(range);
  };

  const totalCalls = dailyMetrics?.total_calls ?? 0;
  const callsPerDay = totalCalls && dateRange?.from && dateRange?.to
    ? Math.round(totalCalls / Math.max(1, (dateRange.to.getTime() - dateRange.from.getTime()) / (1000 * 60 * 60 * 24)))
    : 0;
  
  const topPerformer = repMetrics?.length 
    ? repMetrics.reduce((best, current) => 
        (current.avg_score ?? -Infinity) > (best.avg_score ?? -Infinity) ? current : best, repMetrics[0])
    : null;

  const hasNoMetrics = !isLoading && !error && totalCalls === 0;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
          <div className="flex space-x-2 items-center">
            <DateRangePicker 
              date={dateRange} 
              setDate={handleDateChange}
            />
            
            <TeamFilterWrapper onFilterChange={handleFilterChange}/>
            
            <Select value={timeFrame} onValueChange={setTimeFrame}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Time Frame" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="day">Daily</SelectItem>
                <SelectItem value="week">Weekly</SelectItem>
                <SelectItem value="month">Monthly</SelectItem>
                <SelectItem value="quarter">Quarterly</SelectItem>
                <SelectItem value="year">Yearly</SelectItem>
              </SelectContent>
            </Select>
            
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="icon"
                onClick={handleRefresh}
                disabled={isLoading}
                title="Refresh Data"
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
              </Button>
              
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="icon" title="Export Report">
                    <FileDown className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Export Analytics Report</AlertDialogTitle>
                    <AlertDialogDescription>
                      Choose the format for your analytics report export.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <div className="grid grid-cols-2 gap-4 py-4">
                    <AlertDialogAction asChild>
                      <Button 
                        className="h-24 flex flex-col items-center justify-center gap-2" 
                        variant="outline"
                        onClick={() => handleExport('PDF')}
                      >
                        <Download className="h-8 w-8" />
                        <span>PDF</span>
                      </Button>
                    </AlertDialogAction>
                     <AlertDialogAction asChild>
                      <Button 
                        className="h-24 flex flex-col items-center justify-center gap-2" 
                        variant="outline"
                        onClick={() => handleExport('Excel')}
                      >
                        <Download className="h-8 w-8" />
                        <span>Excel</span>
                      </Button>
                    </AlertDialogAction>
                  </div>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </div>
      </div>
      
      {hasNoMetrics && (
        <Alert variant="default" className="mb-6 bg-yellow-50 border-yellow-400 text-yellow-700">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>No Metrics Data Available</AlertTitle>
          <AlertDescription>
            No metrics data found for the selected period. Please check data sources or adjust filters.
          </AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error Loading Analytics</AlertTitle>
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      )}
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid grid-cols-3 md:w-[450px]">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="sentiment">Sentiment</TabsTrigger>
          <TabsTrigger value="reps">Representatives</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-4">
           <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
               <Card>
                   <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                       <CardTitle className="text-sm font-medium">Total Calls</CardTitle>
                       <Activity className="h-4 w-4 text-muted-foreground" />
                   </CardHeader>
                   <CardContent>
                       {dailyMetricsLoading ? <Skeleton className="h-8 w-16"/> : <div className="text-2xl font-bold">{dailyMetrics?.total_calls ?? 0}</div>}
                       <p className="text-xs text-muted-foreground mt-1">{callsPerDay} calls/day avg</p>
                   </CardContent>
               </Card>
                <Card>
                   <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                       <CardTitle className="text-sm font-medium">Avg Sentiment</CardTitle>
                       <LineChart className="h-4 w-4 text-muted-foreground" />
                   </CardHeader>
                   <CardContent>
                       {dailyMetricsLoading ? <Skeleton className="h-8 w-16"/> : <div className="text-2xl font-bold">{dailyMetrics?.avg_sentiment?.toFixed(2) ?? 'N/A'}</div>}
                       <p className="text-xs text-muted-foreground mt-1">Overall sentiment score</p>
                   </CardContent>
               </Card>
                <Card>
                   <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                       <CardTitle className="text-sm font-medium">Avg Duration</CardTitle>
                       <BarChart className="h-4 w-4 text-muted-foreground" />
                   </CardHeader>
                   <CardContent>
                       {dailyMetricsLoading ? <Skeleton className="h-8 w-16"/> : <div className="text-2xl font-bold">{dailyMetrics?.avg_duration ? `${(dailyMetrics.avg_duration / 60).toFixed(1)} min` : 'N/A'}</div>}
                       <p className="text-xs text-muted-foreground mt-1">Average call length</p>
                   </CardContent>
               </Card>
           </div>
        </TabsContent>
        
        <TabsContent value="sentiment" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Sentiment Trend</CardTitle></CardHeader>
            <CardContent>
              {sentimentLoading ? <Skeleton className="h-60 w-full"/> : 
                <AnalyticsSentimentChart data={sentimentData} />
              }
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="reps" className="space-y-4">
           <Card>
            <CardHeader><CardTitle>Representative Leaderboard</CardTitle></CardHeader>
            <CardContent>
               {repMetricsLoading ? <Skeleton className="h-60 w-full"/> : 
                 <RepLeaderboardTable data={repMetrics} />
               }
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Analytics;
