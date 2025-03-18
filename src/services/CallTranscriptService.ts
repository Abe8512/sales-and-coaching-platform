
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";
import { DateRange } from "react-day-picker";
import { 
  calculateTotalCalls, 
  calculateAvgSentiment, 
  calculateOutcomeDistribution 
} from "@/utils/metricCalculations";

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
  
  const fetchTranscripts = async (filters?: CallTranscriptFilter) => {
    setLoading(true);
    setError(null);
    
    try {
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
      
      // Get count first
      const { count: countResult } = await supabase
        .from('call_transcripts')
        .select('*', { count: 'exact', head: true });
      
      setTotalCount(countResult || 0);
      
      // Then get data
      const { data, error: fetchError } = await query
        .order('created_at', { ascending: false });
      
      if (fetchError) {
        throw new Error(fetchError.message);
      }
      
      setTranscripts(data || []);
    } catch (err) {
      console.error('Error fetching call transcripts:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch call transcripts');
    } finally {
      setLoading(false);
    }
  };

  const getMetrics = () => {
    const totalCalls = calculateTotalCalls(transcripts);
    const avgSentiment = calculateAvgSentiment(transcripts);
    const outcomeStats = calculateOutcomeDistribution(transcripts);
    
    const positiveOutcomes = outcomeStats.filter(o => 
      o.outcome === 'Qualified Lead' || 
      o.outcome === 'Meeting Scheduled' || 
      o.outcome === 'Demo Scheduled'
    );
    
    const successfulCalls = positiveOutcomes.reduce((sum, o) => sum + o.count, 0);
    const conversionRate = totalCalls > 0 ? (successfulCalls / totalCalls) * 100 : 0;
    
    return {
      totalCalls,
      avgSentiment,
      outcomeStats,
      conversionRate
    };
  };
  
  const getCallDistributionData = () => {
    const userCalls: Record<string, number> = {};
    
    transcripts.forEach(transcript => {
      // Use filename as fallback for user name if user_id doesn't map to a name
      const userName = transcript.filename?.split('.')[0] || 'Unknown';
      
      if (!userCalls[userName]) {
        userCalls[userName] = 0;
      }
      userCalls[userName]++;
    });
    
    return Object.entries(userCalls).map(([name, count]) => ({
      name,
      calls: count
    }));
  };
  
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
