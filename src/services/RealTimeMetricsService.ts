
// This file is now a wrapper around SharedDataService for backward compatibility
import { useEffect } from "react";
import {
  useSharedTeamMetrics,
  useSharedRepMetrics,
  type TeamMetricsData as TeamMetrics,
  type RepMetricsData as RepMetrics,
  type DataFilters
} from "./SharedDataService";

// Re-export TeamMetrics and RepMetrics for backward compatibility
export type { TeamMetrics, RepMetrics };

// Custom hook for real-time team metrics
export const useRealTimeTeamMetrics = (filters?: DataFilters): [TeamMetrics, boolean] => {
  const { metrics, isLoading } = useSharedTeamMetrics(filters);
  
  return [metrics, isLoading];
};

// Custom hook for real-time rep metrics
export const useRealTimeRepMetrics = (repIds?: string[]): [RepMetrics[], boolean] => {
  const filters: DataFilters = repIds ? { repIds } : {};
  const { metrics, isLoading } = useSharedRepMetrics(filters);
  
  return [metrics, isLoading];
};
