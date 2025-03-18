
import React, { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Filter, RefreshCw } from "lucide-react";
import PerformanceMetrics from "@/components/Dashboard/PerformanceMetrics";
import HistoricalTrends from "@/components/Performance/HistoricalTrends";
import GoalTracking from "@/components/Performance/GoalTracking";
import KeyMetricsTable from "@/components/Performance/KeyMetricsTable";
import ReportGenerator from "@/components/Performance/ReportGenerator";
import { useAuth } from "@/contexts/AuthContext";
import TeamFilter from "@/components/Performance/TeamFilter";
import { addDays } from "date-fns";

const Performance = () => {
  const { isManager, isAdmin } = useAuth();
  const [date, setDate] = useState({
    from: addDays(new Date(), -30),
    to: new Date(),
  });
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const handleRefresh = () => {
    setIsRefreshing(true);
    // Simulate data refresh
    setTimeout(() => {
      setIsRefreshing(false);
    }, 1000);
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
            <DateRangePicker date={date} setDate={setDate} />
            
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="icon"
                onClick={handleRefresh}
                disabled={isRefreshing}
              >
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
              </Button>
              
              <Button variant="outline" size="icon">
                <Filter className="h-4 w-4" />
              </Button>
              
              <Button variant="outline" size="icon">
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
        
        {(isManager || isAdmin) && <TeamFilter />}
        
        <PerformanceMetrics />
        
        <Tabs defaultValue="trends">
          <TabsList className="mb-6">
            <TabsTrigger value="trends">Historical Trends</TabsTrigger>
            <TabsTrigger value="goals">Goal Tracking</TabsTrigger>
            <TabsTrigger value="metrics">Key Metrics</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
          </TabsList>
          
          <TabsContent value="trends">
            <HistoricalTrends dateRange={date} />
          </TabsContent>
          
          <TabsContent value="goals">
            <GoalTracking dateRange={date} />
          </TabsContent>
          
          <TabsContent value="metrics">
            <KeyMetricsTable dateRange={date} />
          </TabsContent>
          
          <TabsContent value="reports">
            <ReportGenerator dateRange={date} />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default Performance;
