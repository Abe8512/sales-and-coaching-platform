
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Phone, Activity, Clock, AlertCircle } from "lucide-react";
import { TeamMetrics } from "@/services/RealTimeMetricsService";
import { animationUtils } from "@/utils/animationUtils";
import ContentLoader from "@/components/ui/ContentLoader";

interface TeamPerformanceOverviewProps {
  teamMetrics: TeamMetrics;
  teamMetricsLoading: boolean;
  callsLength: number;
}

const TeamPerformanceOverview: React.FC<TeamPerformanceOverviewProps> = ({ 
  teamMetrics, 
  teamMetricsLoading,
  callsLength
}) => {
  // Track previous metrics to smooth transitions
  const [stableMetrics, setStableMetrics] = useState<TeamMetrics | null>(null);
  const [stableCallsLength, setStableCallsLength] = useState(0);
  
  // Smooth transitions for metrics to prevent UI jitter
  useEffect(() => {
    if (!teamMetricsLoading && teamMetrics) {
      if (!stableMetrics) {
        setStableMetrics(teamMetrics);
      } else {
        // Smoothly transition to new values to prevent UI jitter
        const newMetrics = {
          ...stableMetrics,
          totalCalls: animationUtils.smoothTransition(
            teamMetrics.totalCalls, 
            stableMetrics.totalCalls, 
            3
          ),
          avgSentiment: animationUtils.smoothTransition(
            teamMetrics.avgSentiment,
            stableMetrics.avgSentiment,
            0.05
          ),
          avgTalkRatio: {
            agent: animationUtils.smoothTransition(
              teamMetrics.avgTalkRatio?.agent || 0,
              stableMetrics.avgTalkRatio?.agent || 0,
              0.5
            ),
            customer: animationUtils.smoothTransition(
              teamMetrics.avgTalkRatio?.customer || 0,
              stableMetrics.avgTalkRatio?.customer || 0,
              0.5
            )
          },
          topKeywords: teamMetrics.topKeywords // Keywords don't need smoothing
        };
        
        setStableMetrics(newMetrics);
      }
    }
  }, [teamMetrics, teamMetricsLoading, stableMetrics]);
  
  // Smooth transitions for calls length
  useEffect(() => {
    if (stableCallsLength === 0 && callsLength > 0) {
      setStableCallsLength(callsLength);
    } else if (callsLength !== stableCallsLength) {
      setStableCallsLength(prevLength => 
        animationUtils.smoothTransition(callsLength, prevLength, 2)
      );
    }
  }, [callsLength, stableCallsLength]);
  
  return (
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
              <ContentLoader isLoading={teamMetricsLoading} height={80}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Calls</p>
                    <h3 className="text-2xl font-bold mt-1">
                      {stableMetrics ? (stableMetrics?.totalCalls || 0) + stableCallsLength : '...'}
                    </h3>
                  </div>
                  <Phone className="h-8 w-8 text-neon-purple opacity-80" />
                </div>
              </ContentLoader>
            </CardContent>
          </Card>
          
          <Card className="bg-green-50 dark:bg-green-950/20">
            <CardContent className="p-6">
              <ContentLoader isLoading={teamMetricsLoading} height={80}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Avg Sentiment</p>
                    <h3 className="text-2xl font-bold mt-1">
                      {stableMetrics 
                        ? `${Math.round((stableMetrics?.avgSentiment || 0) * 100)}%` 
                        : '...'}
                    </h3>
                  </div>
                  <Activity className="h-8 w-8 text-green-500 opacity-80" />
                </div>
              </ContentLoader>
            </CardContent>
          </Card>
          
          <Card className="bg-blue-50 dark:bg-blue-950/20">
            <CardContent className="p-6">
              <ContentLoader isLoading={teamMetricsLoading} height={80}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Talk Ratio</p>
                    <h3 className="text-2xl font-bold mt-1">
                      {stableMetrics 
                        ? `${Math.round((stableMetrics?.avgTalkRatio?.agent || 0))}:${Math.round((stableMetrics?.avgTalkRatio?.customer || 0))}`
                        : '...'}
                    </h3>
                  </div>
                  <Clock className="h-8 w-8 text-neon-blue opacity-80" />
                </div>
              </ContentLoader>
            </CardContent>
          </Card>
          
          <Card className="bg-amber-50 dark:bg-amber-950/20">
            <CardContent className="p-6">
              <ContentLoader isLoading={teamMetricsLoading} height={80}>
                <div className="flex flex-col">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-muted-foreground">Top Keywords</p>
                    <AlertCircle className="h-5 w-5 text-amber-500 opacity-80" />
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {stableMetrics
                      ? (stableMetrics?.topKeywords?.length || 0) > 0 
                        ? (stableMetrics?.topKeywords || []).map((keyword, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {keyword}
                            </Badge>
                          ))
                        : <p className="text-sm">No keywords recorded</p>
                      : <p className="text-sm">Loading...</p>
                    }
                  </div>
                </div>
              </ContentLoader>
            </CardContent>
          </Card>
        </div>
      </CardContent>
    </Card>
  );
};

export default TeamPerformanceOverview;
