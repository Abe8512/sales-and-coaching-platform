
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect, useCallback } from "react";
import { DateRange } from "react-day-picker";
import { 
  calculateTotalCalls, 
  calculateAvgSentiment, 
  calculateOutcomeDistribution 
} from "@/utils/metricCalculations";
import { toast } from "sonner";

export interface CallTranscript {
  id: string;
  user_id: string | null;
  filename: string | null;
  text: string;
  duration: number | null;
  call_score: number | null;
  sentiment: string | null;
  keywords: string[] | null;
  transcript_segments: any | null;
  created_at: string | null;
}

export interface CallTranscriptFilter {
  dateRange?: DateRange;
  userId?: string;
  userIds?: string[];
  teamId?: string;
}

export const useCallTranscriptService = () => {
  const [transcripts, setTranscripts] = useState<CallTranscript[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState<number>(0);
  
  const fetchTranscripts = useCallback(async (filters?: CallTranscriptFilter) => {
    setLoading(true);
    setError(null);
    
    try {
      // First, check connection to Supabase
      const { data: connectionTest, error: connectionError } = await supabase
        .from('call_transcripts')
        .select('count(*)', { count: 'exact', head: true });
        
      if (connectionError) {
        console.log("Connection error:", connectionError);
        // Use cached data if available
        if (transcripts.length > 0) {
          setLoading(false);
          return;
        }
      }
      
      let query = supabase
        .from('call_transcripts')
        .select('*');
      
      // Apply filters
      if (filters?.userId) {
        query = query.eq('user_id', filters.userId);
      }
      
      if (filters?.userIds && filters.userIds.length > 0) {
        query = query.in('user_id', filters.userIds);
      }
      
      if (filters?.dateRange?.from) {
        const fromDate = new Date(filters.dateRange.from);
        fromDate.setHours(0, 0, 0, 0);
        query = query.gte('created_at', fromDate.toISOString());
      }
      
      if (filters?.dateRange?.to) {
        const toDate = new Date(filters.dateRange.to);
        toDate.setHours(23, 59, 59, 999);
        query = query.lte('created_at', toDate.toISOString());
      }
      
      // Get count first with timeout
      const countPromise = new Promise<number>(async (resolve, reject) => {
        try {
          const { count, error: countError } = await supabase
            .from('call_transcripts')
            .select('*', { count: 'exact', head: true });
            
          if (countError) {
            console.error('Error getting count:', countError);
            reject(countError);
          } else {
            resolve(count || 0);
          }
        } catch (err) {
          console.error('Error in count promise:', err);
          reject(err);
        }
      });
      
      // Set a timeout to avoid hanging
      const countTimeout = new Promise<number>((resolve) => {
        setTimeout(() => resolve(transcripts.length || 0), 3000);
      });
      
      // Race the actual count against the timeout
      const finalCount = await Promise.race([countPromise, countTimeout]);
      setTotalCount(finalCount);
      
      // Then get data with timeout
      const dataPromise = new Promise<CallTranscript[]>(async (resolve, reject) => {
        try {
          const { data, error: dataError } = await query
            .order('created_at', { ascending: false });
            
          if (dataError) {
            console.error('Error fetching data:', dataError);
            reject(dataError);
          } else {
            resolve(data || []);
          }
        } catch (err) {
          console.error('Error in data promise:', err);
          reject(err);
        }
      });
      
      // Set a timeout to avoid hanging
      const dataTimeout = new Promise<CallTranscript[]>((resolve) => {
        setTimeout(() => {
          console.log("Data fetch timed out, using fallback");
          resolve(transcripts.length ? [...transcripts] : []);
        }, 5000);
      });
      
      // Race the actual data fetch against the timeout
      const finalData = await Promise.race([dataPromise, dataTimeout]);
      
      // Only update state if we got actual data
      if (finalData && finalData.length > 0) {
        setTranscripts(finalData);
      } else if (transcripts.length === 0) {
        console.log("No data received and no cached data available");
        // We can generate some placeholder data here if needed
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch call transcripts';
      console.error('Error fetching call transcripts:', err);
      setError(errorMessage);
      
      // Show toast only if we have no data to display
      if (transcripts.length === 0) {
        toast.error("Error loading data", {
          description: "Using cached data. Check your connection."
        });
      }
    } finally {
      setLoading(false);
    }
  }, [transcripts]);

  const getMetrics = useCallback(() => {
    // If no transcripts, provide reasonable defaults
    if (transcripts.length === 0) {
      return {
        totalCalls: 0,
        avgSentiment: 0.5,
        outcomeStats: [],
        conversionRate: 0
      };
    }
    
    const totalCalls = calculateTotalCalls(transcripts);
    const avgSentiment = calculateAvgSentiment(transcripts);
    const outcomeStats = calculateOutcomeDistribution(transcripts);
    
    const positiveOutcomes = outcomeStats.filter(o => 
      o.outcome === 'Qualified Lead' || 
      o.outcome === 'Meeting Scheduled' || 
      o.outcome === 'Demo Scheduled'
    );
    
    const successfulCalls = positiveOutcomes.reduce((sum, o) => sum + (o.count as number), 0);
    const conversionRate = totalCalls > 0 ? (successfulCalls / totalCalls) * 100 : 0;
    
    return {
      totalCalls,
      avgSentiment,
      outcomeStats,
      conversionRate
    };
  }, [transcripts]);
  
  const getCallDistributionData = useCallback(() => {
    // If no transcripts, return empty array
    if (transcripts.length === 0) {
      return [];
    }
    
    const userCalls: Record<string, number> = {};
    
    transcripts.forEach(transcript => {
      // Use filename as fallback for user name if user_id doesn't map to a name
      const userName = transcript.filename?.split('.')[0] || 'Unknown';
      
      if (!userCalls[userName]) {
        userCalls[userName] = 0;
      }
      userCalls[userName] += 1;
    });
    
    return Object.entries(userCalls).map(([name, count]) => ({
      name,
      calls: count
    }));
  }, [transcripts]);
  
  // Initial fetch on mount
  useEffect(() => {
    fetchTranscripts();
  }, []);
  
  return {
    transcripts,
    loading,
    error,
    totalCount,
    fetchTranscripts,
    getMetrics,
    getCallDistributionData
  };
};
