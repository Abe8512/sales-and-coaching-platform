import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Phone, Activity, Clock, AlertCircle, TrendingUp } from "lucide-react";
import ContentLoader from "@/components/ui/ContentLoader";
import { useSharedTeamMetrics, TeamMetricsData, useSharedKeywordData } from '@/services/SharedDataService';
import ExpandableChart from '@/components/ui/ExpandableChart';
import { useSharedFilters } from "@/contexts/SharedFilterContext";

export interface TeamPerformanceOverviewProps {
  dateRange?: {
    from: Date;
    to: Date;
  };
  // Support for legacy props
  teamMetrics?: TeamMetricsData;
  teamMetricsLoading?: boolean;
  callsLength?: number;
}

export const TeamPerformanceOverview: React.FC<TeamPerformanceOverviewProps> = ({ 
  dateRange,
  teamMetrics: externalTeamMetrics,
  teamMetricsLoading: externalLoading,
  callsLength
}) => {
  // Use shared filters context if dateRange isn't explicitly provided
  const { filters } = useSharedFilters();
  const finalDateRange = dateRange || filters.dateRange;
  
  // Use real data from the SharedDataService or external props
  const { 
    metrics: internalTeamMetrics, 
    isLoading: internalLoading 
  } = useSharedTeamMetrics({
    dateRange: finalDateRange
  });
  
  // Also fetch shared keyword data to ensure consistency across components
  const { keywordsByCategory } = useSharedKeywordData({
    dateRange: finalDateRange
  });
  
  // Use external metrics if provided, otherwise use internal metrics
  const teamMetrics = externalTeamMetrics || internalTeamMetrics;
  const metricsLoading = externalLoading !== undefined ? externalLoading : internalLoading;
  
  // Get all keywords from all categories for display
  const allKeywords = [
    ...(keywordsByCategory?.positive || []),
    ...(keywordsByCategory?.neutral || []),
    ...(keywordsByCategory?.negative || [])
  ];
  
  // Get top keywords (limit to 10)
  const topKeywords = allKeywords.slice(0, 10);
  
  // Custom stable loading state to prevent UI flicker
  const [isStableLoading, setIsStableLoading] = useState(true);
  
  useEffect(() => {
    if (metricsLoading) {
      // Don't immediately show loading state, wait a bit to prevent flicker
      const timer = setTimeout(() => {
        setIsStableLoading(true);
      }, 100);
      
      return () => clearTimeout(timer);
    } else {
      // Keep showing loading for a bit after data arrives
      const timer = setTimeout(() => {
        setIsStableLoading(false);
      }, 800);
      
      return () => clearTimeout(timer);
    }
  }, [metricsLoading]);
  
  return (
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <CardTitle>Team Performance Overview</CardTitle>
        <CardDescription>
          Real-time metrics from all calls and recordings
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ContentLoader isLoading={isStableLoading} height={200}>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <Card className="bg-purple-50 dark:bg-purple-950/20">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Calls</p>
                    <h3 className="text-2xl font-bold mt-1">
                      {teamMetrics?.totalCalls || 0}
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
                      {Math.round((teamMetrics?.avgSentiment || 0) * 100)}%
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
                    <p className="text-sm font-medium text-muted-foreground">Performance</p>
                    <h3 className="text-2xl font-bold mt-1">
                      {Math.round(teamMetrics?.performanceScore || 0)}%
                    </h3>
                  </div>
                  <Clock className="h-8 w-8 text-neon-blue opacity-80" />
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-amber-50 dark:bg-amber-950/20">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Talk Ratio</p>
                    <h3 className="text-2xl font-bold mt-1">
                      {teamMetrics?.avgTalkRatio 
                        ? `${Math.round(teamMetrics.avgTalkRatio.agent)}:${Math.round(teamMetrics.avgTalkRatio.customer)}`
                        : '0:0'}
                    </h3>
                  </div>
                  <TrendingUp className="h-8 w-8 text-amber-500 opacity-80" />
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Keywords Section */}
          <Card className="mt-6">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Top Keywords & Topics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-1 mt-2">
                {topKeywords && topKeywords.length > 0 ? (
                  topKeywords.map((keyword, idx) => (
                    <Badge key={idx} variant="outline" className="text-xs">
                      {keyword}
                    </Badge>
                  ))
                ) : (
                  <p className="text-center text-muted-foreground py-4">No keywords recorded</p>
                )}
              </div>
            </CardContent>
          </Card>
        </ContentLoader>
      </CardContent>
    </Card>
  );
};

// Also export as default for compatibility with default imports
export default TeamPerformanceOverview;
