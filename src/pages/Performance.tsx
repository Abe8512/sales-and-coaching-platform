import React from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Filter, RefreshCw, FileDown, Settings } from "lucide-react";
import PerformanceMetrics from "@/components/Dashboard/PerformanceMetrics";
import HistoricalTrends from "@/components/Performance/HistoricalTrends";
import GoalTracking from "@/components/Performance/GoalTracking";
import KeyMetricsTable from "@/components/Performance/KeyMetricsTable";
import ReportGenerator from "@/components/Performance/ReportGenerator";
import { useAuth } from "@/contexts/AuthContext";
import TeamFilter from "@/components/Performance/TeamFilter";
import LiveCallAnalysis from "@/components/Performance/LiveCallAnalysis";
import CustomScoring from "@/components/Performance/CustomScoring";
import AISimulator from "@/components/Performance/AISimulator";
import LearningPath from "@/components/Performance/LearningPath";
import { DateRangeFilter } from "@/components/CallAnalysis/DateRangeFilter";
import { useSharedFilters } from "@/contexts/SharedFilterContext";
import { useAnalyticsTeamMetrics } from "@/services/AnalyticsHubService";
import { useToast } from "@/hooks/use-toast";
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

const Performance = () => {
  const { isManager, isAdmin } = useAuth();
  const { toast } = useToast();
  const { filters, updateDateRange } = useSharedFilters();
  const { refreshMetrics, isLoading } = useAnalyticsTeamMetrics(filters);
  const [activeTab, setActiveTab] = React.useState("trends");
  
  const handleRefresh = () => {
    refreshMetrics();
    toast({
      title: "Data Refreshed",
      description: "Performance metrics updated with latest data",
    });
  };
  
  const handleExport = () => {
    toast({
      title: "Report Exported",
      description: "Performance report has been downloaded",
    });
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6 p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-between sm:items-center">
          <div>
            <h1 className="text-3xl font-bold">Performance Analytics</h1>
            <p className="text-muted-foreground">
              Track performance metrics and analyze trends over time.
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-2">
            <DateRangeFilter 
              dateRange={filters.dateRange} 
              setDateRange={updateDateRange}
            />
            
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
        
        {(isManager || isAdmin) && <TeamFilter />}
        
        <PerformanceMetrics />
        
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
          
          <TabsContent value="trends">
            <HistoricalTrends dateRange={filters.dateRange} />
          </TabsContent>
          
          <TabsContent value="goals">
            <GoalTracking dateRange={filters.dateRange} />
          </TabsContent>
          
          <TabsContent value="metrics">
            <KeyMetricsTable dateRange={filters.dateRange} />
          </TabsContent>
          
          <TabsContent value="reports">
            <ReportGenerator dateRange={filters.dateRange} />
          </TabsContent>
          
          <TabsContent value="live-analysis">
            <LiveCallAnalysis />
          </TabsContent>
          
          <TabsContent value="scoring">
            <CustomScoring />
          </TabsContent>
          
          <TabsContent value="simulator">
            <AISimulator />
          </TabsContent>
          
          <TabsContent value="learning">
            <LearningPath />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default Performance;
