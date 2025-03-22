import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Phone, Activity, Clock, AlertCircle, TrendingUp } from "lucide-react";
import ContentLoader from "@/components/ui/ContentLoader";
import { useSharedTeamMetrics, TeamMetricsData, useKeywordTrends } from '@/services/SharedDataService';
import ExpandableChart from '@/components/ui/ExpandableChart';
import { useSharedFilters } from "@/contexts/SharedFilterContext";
import { useStableLoadingState } from '@/hooks/useStableLoadingState';

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
  
  // Also fetch keyword trends data to ensure consistency across components
  const { keywordData, isLoading: keywordsLoading } = useKeywordTrends({
    dateRange: finalDateRange
  });
  
  // Use external metrics if provided, otherwise use internal metrics
  const teamMetrics = externalTeamMetrics || internalTeamMetrics;
  const rawLoading = externalLoading !== undefined ? externalLoading : internalLoading || keywordsLoading;
  
  // Get all keywords from keyword data for display
  const topKeywords = keywordData?.slice(0, 10).map(item => item.keyword) || [];
  
  // Use the stable loading state hook for consistent loading behavior
  const isStableLoading = useStableLoadingState(rawLoading, 800);
  
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
