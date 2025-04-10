import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Phone, Activity, Clock, AlertCircle, TrendingUp } from "lucide-react";
import ContentLoader from "../../components/ui/ContentLoader";
import { useSharedTeamMetrics, TeamMetricsData, useKeywordTrends } from '../../services/SharedDataService';
import ExpandableChart from '../../components/ui/ExpandableChart';
import { useSharedFilters } from "../../contexts/SharedFilterContext";
import { useStableLoadingState } from '../../hooks/useStableLoadingState';
import { DailyMetrics } from '../../services/repositories/AnalyticsRepository';
import { Skeleton } from "../../components/ui/skeleton";

export interface TeamPerformanceOverviewProps {
  teamMetrics?: DailyMetrics | null;
  teamMetricsLoading?: boolean;
}

export const TeamPerformanceOverview: React.FC<TeamPerformanceOverviewProps> = ({ 
  teamMetrics,
  teamMetricsLoading 
}) => {
  // Remove internal data fetching hooks (useSharedTeamMetrics, useKeywordTrends)
  // const { filters } = useSharedFilters();
  // const { metrics: internalTeamMetrics, isLoading: internalLoading } = useSharedTeamMetrics(...);
  // const { keywordData, isLoading: keywordsLoading } = useKeywordTrends(...);

  // Directly use the props
  const rawLoading = teamMetricsLoading;
  const isStableLoading = useStableLoadingState(rawLoading, 800);
  
  // Extract keywords directly from teamMetrics if available, otherwise default
  // Note: DailyMetrics doesn't have keywords, this needs adjustment or removal
  const topKeywords: string[] = []; // Placeholder - keywords need different source

  // Helper to safely access possibly nested talk ratio
  const getTalkRatioString = (metrics: DailyMetrics | null | undefined): string => {
    if (!metrics || metrics.avg_talk_ratio_agent == null || metrics.avg_talk_ratio_customer == null) {
        return '0:0';
    }
    return `${Math.round(metrics.avg_talk_ratio_agent * 100)}:${Math.round(metrics.avg_talk_ratio_customer * 100)}`;
  };
  
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
                      {teamMetrics?.total_calls ?? 0}
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
                      {teamMetrics?.avg_sentiment != null ? `${Math.round(teamMetrics.avg_sentiment * 100)}%` : 'N/A'}
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
                      {teamMetrics?.performance_score != null ? `${Math.round(teamMetrics.performance_score)}%` : 'N/A'}
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
                      {getTalkRatioString(teamMetrics)}
                    </h3>
                  </div>
                  <TrendingUp className="h-8 w-8 text-amber-500 opacity-80" />
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Keywords Section - Needs a different data source */}
          <Card className="mt-6">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Top Keywords & Topics</CardTitle>
            </CardHeader>
            <CardContent>
               {isStableLoading ? <Skeleton className="h-6 w-full"/> : (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {topKeywords.length > 0 ? (
                      topKeywords.map((keyword, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {keyword}
                        </Badge>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">Keywords data unavailable.</p>
                    )}
                  </div>
               )}
            </CardContent>
          </Card>
        </ContentLoader>
      </CardContent>
    </Card>
  );
};

export default TeamPerformanceOverview;
