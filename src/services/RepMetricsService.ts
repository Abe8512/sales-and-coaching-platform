import { metricsCache } from './CacheService';
import { errorHandler } from './ErrorHandlingService';
import { getRepMetricsForId as getSharedRepMetricsForId } from './SharedDataService';

// Constants
const METRICS_CACHE_TTL = 60000; // 60 seconds

/**
 * Interface for rep metrics data
 */
export interface RepMetrics {
  callVolume: number;
  successRate: number;
  sentiment: number;
  topKeywords: string[];
  insights: string[];
}

/**
 * Get metrics for a specific sales rep by ID
 * @deprecated Use getRepMetricsForId from SharedDataService instead
 */
export const getRepMetricsForId = async (repId: string): Promise<RepMetrics | null> => {
  try {
    // Delegate to the shared data service which is now the central source of truth
    const sharedMetrics = await getSharedRepMetricsForId(repId);
    
    if (sharedMetrics) {
      return {
        callVolume: sharedMetrics.callVolume,
        successRate: sharedMetrics.successRate,
        sentiment: sharedMetrics.sentiment,
        topKeywords: sharedMetrics.topKeywords,
        insights: sharedMetrics.insights
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching rep metrics:', error);
    errorHandler.handleError({
      message: 'Failed to load sales rep metrics',
      technical: error,
      severity: 'warning',
      code: 'REP_METRICS_FETCH_ERROR'
    }, 'RepMetricsService');
    return null;
  }
}; 