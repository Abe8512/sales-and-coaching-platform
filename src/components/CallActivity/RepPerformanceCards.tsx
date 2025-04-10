import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import ContentLoader from '@/components/ui/ContentLoader';
import { useStableLoadingState } from '@/hooks/useStableLoadingState';
import { RepPerformanceData } from '@/services/repositories/AnalyticsRepository';
import { animationUtils } from '@/utils/animationUtils';

export interface RepPerformanceCardsProps {
  repMetrics?: RepPerformanceData[] | null;
  repMetricsLoading?: boolean;
}

const RepPerformanceCards: React.FC<RepPerformanceCardsProps> = ({ 
  repMetrics,
  repMetricsLoading
}) => {
  const rawLoading = repMetricsLoading;
  const isStableLoading = useStableLoadingState(rawLoading, 800);
  
  const displayData = useMemo(() => {
    if (!repMetrics) return [];
    return repMetrics.map(rep => ({
      id: rep.rep_id,
      name: rep.rep_name ?? 'Unknown Rep',
      callVolume: rep.total_calls ?? 0,
      successRate: Math.max(0, Math.min(100, (rep.avg_score ?? 0))),
      sentimentScore: rep.avg_score ?? 0,
      insights: []
    }));
  }, [repMetrics]);

  const [stableMetrics, setStableMetrics] = useState(displayData);
  useEffect(() => {
     if (!isStableLoading) {
       setStableMetrics(displayData);
     }
  }, [displayData, isStableLoading]);
  
  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Individual Performance</CardTitle>
        <CardDescription>
          Performance metrics for individual team members
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ContentLoader isLoading={isStableLoading} height={300} skeletonCount={3}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {stableMetrics.length > 0 ? (
              stableMetrics.map(rep => (
                <Card key={rep.id} className="overflow-hidden">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">{rep.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Call Volume</span>
                        <span className="font-medium">{Math.round(rep.callVolume)}</span>
                      </div>
                      <Progress 
                        value={rep.callVolume} 
                        max={100}
                        className="h-1.5 transition-all duration-500" 
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Avg Score (Success)</span>
                        <span className="font-medium">{Math.round(rep.successRate)}%</span>
                      </div>
                      <Progress 
                        value={rep.successRate} 
                        className="h-1.5 transition-all duration-500" 
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Avg Score (Sentiment)</span>
                        <span className="font-medium">{Math.round(rep.sentimentScore)}</span>
                      </div>
                      <Progress 
                        value={rep.sentimentScore} 
                        className="h-1.5 transition-all duration-500" 
                      />
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <p className="text-muted-foreground text-center col-span-full py-8">No representative data available</p>
            )}
          </div>
        </ContentLoader>
      </CardContent>
    </Card>
  );
};

export default RepPerformanceCards;
