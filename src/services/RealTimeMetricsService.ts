
// This file is now a wrapper around SharedDataService for backward compatibility
import { useEffect, useMemo } from "react";
import {
  useSharedTeamMetrics,
  useSharedRepMetrics,
  type TeamMetricsData as TeamMetrics,
  type RepMetricsData as RepMetrics,
  type DataFilters
} from "./SharedDataService";
import { validateMetricConsistency } from "@/utils/metricCalculations";
import { animationUtils } from "@/utils/animationUtils";

// Re-export TeamMetrics and RepMetrics for backward compatibility
export type { TeamMetrics, RepMetrics };

// Custom hook for real-time team metrics
export const useRealTimeTeamMetrics = (filters?: DataFilters): [TeamMetrics, boolean] => {
  const { metrics, isLoading } = useSharedTeamMetrics(filters);
  
  // Stabilize the metrics data to prevent UI jitter
  const stableMetrics = useMemo(() => {
    if (!metrics) return metrics;
    
    return {
      ...metrics,
      // Round percentage values to prevent small fluctuations
      performanceScore: Math.round(metrics.performanceScore),
      conversionRate: Math.round(metrics.conversionRate * 10) / 10,
      // Ensure talk ratio always adds up to 100%
      avgTalkRatio: {
        agent: Math.round(metrics.avgTalkRatio.agent),
        customer: Math.round(100 - Math.round(metrics.avgTalkRatio.agent))
      }
    };
  }, [metrics]);
  
  // Add data validation in development mode
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' && metrics) {
      // Check for performance score consistency
      validateMetricConsistency('Performance Score', [metrics.performanceScore]);
      
      // Check for conversion rate consistency
      validateMetricConsistency('Conversion Rate', [metrics.conversionRate]);
    }
  }, [metrics]);
  
  return [stableMetrics, isLoading];
};

// Custom hook for real-time rep metrics
export const useRealTimeRepMetrics = (repIds?: string[]): [RepMetrics[], boolean] => {
  const filters: DataFilters = repIds ? { repIds } : {};
  const { metrics, isLoading } = useSharedRepMetrics(filters);
  
  // Stabilize rep metrics data
  const stableMetrics = useMemo(() => {
    if (!metrics) return metrics;
    
    return metrics.map(rep => ({
      ...rep,
      // Round percentage values
      successRate: Math.round(rep.successRate),
      sentiment: Math.round(rep.sentiment * 100) / 100
    }));
  }, [metrics]);
  
  return [stableMetrics, isLoading];
};
