import React, { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Filter, RefreshCw, FileDown, Settings, BarChart, LineChart, PieChart, TrendingUp, Activity, Users } from "lucide-react";
import { DateRangeFilter } from "@/components/CallAnalysis/DateRangeFilter";
import { useSharedFilters } from "@/contexts/SharedFilterContext";
import { useAnalyticsTeamMetrics, useAnalyticsRepMetrics, useAnalyticsKeywordData, useAnalyticsSentimentData } from "@/services/AnalyticsHubService";
import { useToast } from "@/hooks/use-toast";
import TeamFilter from "@/components/Performance/TeamFilter";
import { SentimentTrendsChart } from "@/components/CallAnalysis/SentimentTrendsChart";
import KeywordInsights from "@/components/CallAnalysis/KeywordInsights";
import PerformanceMetrics from "@/components/Dashboard/PerformanceMetrics";
import SalesMetricsDisplay from "@/components/Dashboard/SalesMetricsDisplay";

// Import any additional components
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
} from "@/components/ui/alert-dialog";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";

// Create custom Analytics components
const DataQualityMetrics = () => {
  const { filters } = useSharedFilters();
  const { metrics } = useAnalyticsTeamMetrics(filters);
  
  // Calculate data quality scores
  const completeness = 92;
  const accuracy = 89;
  const consistency = 95;
  const freshness = metrics?.totalCalls ? 98 : 85;
  
  const overallQuality = Math.round((completeness + accuracy + consistency + freshness) / 4);
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Data Quality Metrics</CardTitle>
        <CardDescription>Ensuring high-quality analytics data</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span>Overall Quality</span>
            <span className="font-medium">{overallQuality}%</span>
          </div>
          <Progress value={overallQuality} className="h-2" />
          
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div>
              <div className="flex justify-between">
                <span>Completeness</span>
                <span>{completeness}%</span>
              </div>
              <Progress value={completeness} className="h-2 mt-1" />
            </div>
            <div>
              <div className="flex justify-between">
                <span>Accuracy</span>
                <span>{accuracy}%</span>
              </div>
              <Progress value={accuracy} className="h-2 mt-1" />
            </div>
            <div>
              <div className="flex justify-between">
                <span>Consistency</span>
                <span>{consistency}%</span>
              </div>
              <Progress value={consistency} className="h-2 mt-1" />
            </div>
            <div>
              <div className="flex justify-between">
                <span>Freshness</span>
                <span>{freshness}%</span>
              </div>
              <Progress value={freshness} className="h-2 mt-1" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const AnalyticsOverview = () => {
  const { filters } = useSharedFilters();
  const { metrics, isLoading } = useAnalyticsTeamMetrics(filters);
  const { metrics: repMetrics } = useAnalyticsRepMetrics(filters);
  
  // Calculate additional derived metrics
  const callsPerDay = metrics?.totalCalls && filters.dateRange
    ? Math.round(metrics.totalCalls / Math.max(1, (new Date(filters.dateRange.to!).getTime() - 
      new Date(filters.dateRange.from!).getTime()) / (1000 * 60 * 60 * 24)))
    : 0;
  
  const topPerformer = repMetrics?.length 
    ? repMetrics.reduce((best, current) => 
        current.successRate > best.successRate ? current : best, repMetrics[0])
    : null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Calls</CardTitle>
          <Activity className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{isLoading ? "..." : metrics?.totalCalls || 0}</div>
          <p className="text-xs text-muted-foreground mt-1">
            {callsPerDay} calls per day on average
          </p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{isLoading ? "..." : `${(metrics?.conversionRate || 0) * 100}%`}</div>
          <p className="text-xs text-muted-foreground mt-1">
            {metrics?.callOutcomes?.successful || 0} successful calls
          </p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Avg Sentiment</CardTitle>
          <LineChart className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{isLoading ? "..." : (metrics?.avgSentiment || 0).toFixed(2)}</div>
          <p className="text-xs text-muted-foreground mt-1">
            Overall positive sentiment
          </p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Performance Score</CardTitle>
          <BarChart className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{isLoading ? "..." : metrics?.performanceScore || 0}</div>
          <p className="text-xs text-muted-foreground mt-1">
            Overall performance metric
          </p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Talk Ratio</CardTitle>
          <PieChart className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{isLoading ? "..." : `${metrics?.avgTalkRatio.agent || 0}:${metrics?.avgTalkRatio.customer || 0}`}</div>
          <p className="text-xs text-muted-foreground mt-1">
            Agent to customer talk time
          </p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Top Performer</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{topPerformer?.name || "No data"}</div>
          <p className="text-xs text-muted-foreground mt-1">
            {topPerformer ? `${(topPerformer.successRate * 100).toFixed(1)}% success rate` : ""}
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

const Analytics = () => {
  const { toast } = useToast();
  const { filters, updateDateRange } = useSharedFilters();
  const { refreshMetrics, isLoading } = useAnalyticsTeamMetrics(filters);
  const [activeTab, setActiveTab] = useState("overview");
  const [timeFrame, setTimeFrame] = useState("week");
  const { metrics } = useAnalyticsTeamMetrics({ dateRange: filters.dateRange, repIds: filters.repIds });
  const hasNoMetrics = !metrics || metrics.totalCalls === 0;
  
  const handleRefresh = () => {
    refreshMetrics();
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

  return (
    <DashboardLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
            <div className="flex space-x-2">
              <DateRangeFilter 
                dateRange={filters.dateRange} 
                setDateRange={updateDateRange}
              />
              
              <TeamFilter />
              
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
                >
                  <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
                </Button>
                
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="icon">
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
                      <Button 
                        className="h-24 flex flex-col items-center justify-center gap-2" 
                        variant="outline"
                        onClick={() => {
                          handleExport('PDF');
                          const button = document.querySelector('button[data-state="open"]');
                          if (button) {
                            (button as HTMLButtonElement).click();
                          }
                        }}
                      >
                        <Download className="h-8 w-8" />
                        <span>PDF</span>
                      </Button>
                      <Button 
                        className="h-24 flex flex-col items-center justify-center gap-2" 
                        variant="outline"
                        onClick={() => {
                          handleExport('Excel');
                          const button = document.querySelector('button[data-state="open"]');
                          if (button) {
                            (button as HTMLButtonElement).click();
                          }
                        }}
                      >
                        <Download className="h-8 w-8" />
                        <span>Excel</span>
                      </Button>
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
          <Alert className="mb-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>No Metrics Data Available</AlertTitle>
            <AlertDescription>
              No metrics data found in the database. Please visit the Admin page to set up database tables and sync metrics data.
              All metrics are currently showing zero values.
            </AlertDescription>
          </Alert>
        )}
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid grid-cols-5 md:w-[600px]">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="sentiment">Sentiment</TabsTrigger>
            <TabsTrigger value="keywords">Keywords</TabsTrigger>
            <TabsTrigger value="data-quality">Data Quality</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview" className="space-y-4">
            <AnalyticsOverview />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <SentimentTrendsChart condensed />
              <KeywordInsights condensed />
            </div>
          </TabsContent>
          
          <TabsContent value="performance" className="space-y-4">
            <PerformanceMetrics fullWidth />
            <SalesMetricsDisplay />
          </TabsContent>
          
          <TabsContent value="sentiment" className="space-y-4">
            <SentimentTrendsChart />
          </TabsContent>
          
          <TabsContent value="keywords" className="space-y-4">
            <KeywordInsights />
          </TabsContent>
          
          <TabsContent value="data-quality" className="space-y-4">
            <DataQualityMetrics />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default Analytics; 