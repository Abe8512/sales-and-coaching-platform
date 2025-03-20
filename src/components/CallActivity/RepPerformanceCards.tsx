import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import ContentLoader from '@/components/ui/ContentLoader';
import { useSharedRepMetrics } from '@/services/SharedDataService';
import { useStableLoadingState } from '@/hooks/useStableLoadingState';
import { RepMetricsData } from '@/services/SharedDataService';
import { animationUtils } from '@/utils/animationUtils';

export interface RepPerformanceCardsProps {
  dateRange?: {
    from: Date;
    to: Date;
  };
  selectedRepIds?: string[];
  // Support for legacy props
  repMetrics?: RepMetricsData[];
  repMetricsLoading?: boolean;
}

const RepPerformanceCards: React.FC<RepPerformanceCardsProps> = ({ 
  dateRange,
  selectedRepIds,
  repMetrics: externalRepMetrics,
  repMetricsLoading: externalLoading
}) => {
  // Fetch real rep metrics from SharedDataService
  const { 
    metrics: internalRepMetrics, 
    isLoading: internalLoading 
  } = useSharedRepMetrics({
    dateRange,
    repIds: selectedRepIds
  });
  
  // Use external metrics if provided, otherwise use internal metrics
  const repMetrics = externalRepMetrics as RepMetricsData[] || internalRepMetrics;
  const repMetricsLoading = externalLoading !== undefined ? externalLoading : internalLoading;
  
  // Store stable metrics to prevent UI jitter during updates
  const [stableMetrics, setStableMetrics] = useState<RepMetricsData[]>([]);
  const [isStableLoading, setIsStableLoading] = useState(true);
  
  // Custom stable loading state implementation
  useEffect(() => {
    if (repMetricsLoading) {
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
  }, [repMetricsLoading]);
  
  useEffect(() => {
    if (isStableLoading) return;
    
    // Initialize with first data load
    if (stableMetrics.length === 0 && repMetrics.length > 0) {
      setStableMetrics(repMetrics);
      return;
    }
    
    // Only update metrics with smooth transitions when data changes
    if (repMetrics.length > 0) {
      const smoothedMetrics = repMetrics.map(rep => {
        // Find existing rep data
        const existingRep = stableMetrics.find(sr => sr.id === rep.id);
        
        if (existingRep) {
          // Apply smooth transitions to prevent UI jitter
          return {
            ...rep,
            callVolume: animationUtils.smoothTransition(rep.callVolume, existingRep.callVolume, 2),
            successRate: animationUtils.smoothTransition(rep.successRate, existingRep.successRate, 3),
            sentiment: animationUtils.smoothTransition(rep.sentiment, existingRep.sentiment, 0.05)
          };
        }
        
        return rep;
      });
      
      setStableMetrics(smoothedMetrics);
    }
  }, [repMetrics, isStableLoading, stableMetrics]);
  
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
                        value={rep.callVolume / 2} 
                        className="h-1.5 transition-all duration-500" 
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Success Rate</span>
                        <span className="font-medium">{Math.round(rep.successRate)}%</span>
                      </div>
                      <Progress 
                        value={rep.successRate} 
                        className="h-1.5 transition-all duration-500" 
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Customer Sentiment</span>
                        <span className="font-medium">{Math.round(rep.sentiment * 100)}%</span>
                      </div>
                      <Progress 
                        value={rep.sentiment * 100} 
                        className="h-1.5 transition-all duration-500" 
                      />
                    </div>
                    
                    <div>
                      <h4 className="text-sm font-medium mb-1">AI Insights</h4>
                      <ul className="text-sm space-y-1">
                        {rep.insights.map((insight, idx) => (
                          <li key={idx} className="flex items-start">
                            <div className="w-1.5 h-1.5 rounded-full bg-neon-purple mt-1.5 mr-2"></div>
                            {String(insight)}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <p>No representative data available</p>
            )}
          </div>
        </ContentLoader>
      </CardContent>
    </Card>
  );
};

export default RepPerformanceCards;
