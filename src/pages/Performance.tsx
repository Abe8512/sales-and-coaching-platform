import React, { useState, useEffect } from 'react';
// import DashboardLayout from '../components/layout/DashboardLayout'; // Remove import
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from "../components/ui/button";
import { Download, Filter, RefreshCw, FileDown, Settings } from "lucide-react";
import PerformanceMetrics from "../components/Dashboard/PerformanceMetrics"; // Verify path
import HistoricalTrends from "../components/Performance/HistoricalTrends"; // Verify path
import GoalTracking from "../components/Performance/GoalTracking"; // Verify path
import KeyMetricsTable from "../components/Performance/KeyMetricsTable"; // Verify path
import ReportGenerator from "../components/Performance/ReportGenerator"; // Verify path
import { useAuth } from "../contexts/AuthContext";
// Removed TeamFilter import, using TeamFilterWrapper
import LiveCallAnalysis from "../components/Performance/LiveCallAnalysis"; // Verify path
import CustomScoring from "../components/Performance/CustomScoring"; // Verify path
import AISimulator from "../components/Performance/AISimulator"; // Verify path
import LearningPath from "../components/Performance/LearningPath"; // Verify path
// Removed DateRangeFilter import, using DateRangePicker
// import { useSharedFilters } from "../contexts/SharedFilterContext"; // Removed unused hook
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
} from "../components/ui/alert-dialog"; // Use relative path

// Import correct hook names from relative path
import {
    useAnalyticsDailyMetrics,
    useAnalyticsRepMetrics
    // Don't need to import interfaces DailyMetrics, RepPerformanceData here
} from "../services/AnalyticsHubService";
import { DateRangePicker } from '../components/ui/date-range-picker'; // Use relative path
// Remove Select import if TeamFilterWrapper handles rep selection internally
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
// Remove missing component imports
// import PerformanceTrendsChart from '../components/Performance/PerformanceTrendsChart';
import TeamFilterWrapper from '../components/Performance/TeamFilterWrapper'; // Use relative path
// import RepPerformanceTable from '../components/Performance/RepPerformanceTable';
import { DateRange } from 'react-day-picker';
import { useToast } from "../hooks/use-toast"; // Use relative path (Verify this path!)

const Performance: React.FC = () => {
  const { isManager, isAdmin } = useAuth();
  const { toast } = useToast();
  // Removed filters state from useSharedFilters
  const [filters, setFilters] = useState<{
    repIds?: string[];
    // Add other filter fields as needed by TeamFilterWrapper
  }>({});
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [activeTab, setActiveTab] = React.useState("trends"); // Added state for activeTab

  // Use correct hook name
  const {
      metrics: dailyMetrics,
      isLoading: dailyMetricsLoading,
      error: dailyMetricsError,
      refreshMetrics: refreshDailyMetrics
  } = useAnalyticsDailyMetrics({
      dateRange: {
          from: dateRange?.from?.toISOString().split('T')[0],
          to: dateRange?.to?.toISOString().split('T')[0]
      },
  });

  const {
      metrics: repMetrics, // This might not be used if RepPerformanceTable is removed
      isLoading: repMetricsLoading,
      error: repMetricsError,
      refreshMetrics: refreshRepMetrics
  } = useAnalyticsRepMetrics({
      dateRange: {
          from: dateRange?.from?.toISOString().split('T')[0],
          to: dateRange?.to?.toISOString().split('T')[0]
      },
      repIds: filters.repIds
  });

  // Combine loading/error states
  const isLoading = dailyMetricsLoading || repMetricsLoading;
  const error = dailyMetricsError || repMetricsError;

  // Refresh handler
  const handleRefresh = () => {
    refreshDailyMetrics();
    refreshRepMetrics(); // Keep refreshing rep metrics for now
    toast({
      title: "Data Refreshed",
      description: "Performance metrics updated with latest data",
    });
  };

  // Export handler
  const handleExport = () => {
    toast({
      title: "Report Exported",
      description: "Performance report has been downloaded",
    });
  };

  // Filter change handlers
  const handleFilterChange = (newFilters: Partial<typeof filters>) => {
    // Assuming TeamFilterWrapper provides non-date filters
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  const handleDateChange = (range: DateRange | undefined) => {
    setDateRange(range);
  };

  // useEffect(() => {
    // Hooks handle their own refreshing based on dependencies
  // }, [dateRange, filters]);

  return (
    // Remove DashboardLayout wrapper
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:justify-between sm:items-center">
        <div>
          <h1 className="text-3xl font-bold">Performance Analytics</h1>
          <p className="text-muted-foreground">
            Track performance metrics and analyze trends over time.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          {/* Date Range Picker */}
          <DateRangePicker
            date={dateRange}
            setDate={handleDateChange}
          />
          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button variant="outline" size="icon" onClick={handleRefresh} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            </Button>
            {/* Export Dialog */}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="icon">
                  <FileDown className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Export Performance Report</AlertDialogTitle>
                  <AlertDialogDescription>
                    Choose the format for your performance report export.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="grid grid-cols-2 gap-4 py-4">
                  <Button
                    className="h-24 flex flex-col items-center justify-center gap-2"
                    variant="outline"
                    onClick={handleExport}
                  >
                    <FileDown className="h-8 w-8" />
                    <span>PDF Report</span>
                  </Button>
                  <Button
                    className="h-24 flex flex-col items-center justify-center gap-2"
                    variant="outline"
                    onClick={handleExport}
                  >
                    <Download className="h-8 w-8" />
                    <span>CSV Data</span>
                  </Button>
                </div>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <Button variant="outline" size="icon">
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Team Filter */}
      {(isManager || isAdmin) && <TeamFilterWrapper onFilterChange={handleFilterChange} />}

      {/* Error Display */}
      {error && (
        <div className="bg-red-100 text-red-700 p-4 rounded mb-4">Error loading performance data: {error.message}</div>
      )}

      <PerformanceMetrics loading={dailyMetricsLoading} />

      <Tabs defaultValue="trends" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="trends">Historical Trends</TabsTrigger>
          <TabsTrigger value="goals">Goal Tracking</TabsTrigger>
          <TabsTrigger value="metrics">Key Metrics</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
          <TabsTrigger value="live-analysis">Live Call Analysis</TabsTrigger>
          {isManager && <TabsTrigger value="scoring">Scoring Criteria</TabsTrigger>}
          <TabsTrigger value="simulator">AI Simulator</TabsTrigger>
          <TabsTrigger value="learning">Learning Path</TabsTrigger>
        </TabsList>

        {/* Ensure these components exist and accept passed props */}
        <TabsContent value="trends"><HistoricalTrends dateRange={dateRange} /></TabsContent>
        <TabsContent value="goals"><GoalTracking dateRange={dateRange} /></TabsContent>
        <TabsContent value="metrics"><KeyMetricsTable dateRange={dateRange} /></TabsContent>
        <TabsContent value="reports"><ReportGenerator dateRange={dateRange} /></TabsContent>
        <TabsContent value="live-analysis"><LiveCallAnalysis /></TabsContent>
        <TabsContent value="scoring"><CustomScoring /></TabsContent>
        <TabsContent value="simulator"><AISimulator /></TabsContent>
        <TabsContent value="learning"><LearningPath /></TabsContent>
      </Tabs>
    </div>
  );
};

export default Performance;
