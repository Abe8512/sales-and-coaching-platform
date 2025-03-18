import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect, useCallback } from "react";
import { DateRange } from "react-day-picker";
import { 
  calculateTotalCalls, 
  calculateAvgSentiment, 
  calculateOutcomeDistribution 
} from "@/utils/metricCalculations";
import { toast } from "sonner";
import { useEventsStore } from "@/services/events";

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
  const [lastFetchTime, setLastFetchTime] = useState<number>(0);
  const dispatchEvent = useEventsStore.getState().dispatchEvent;
  
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
        
        // Dispatch an event to notify other components that transcripts were refreshed
        dispatchEvent('transcripts-refreshed', {
          count: finalData.length,
          filters: filters
        });
        
        // Also update calls table to ensure metrics are fresh
        await refreshCallsTable(finalData);
      } else if (transcripts.length === 0) {
        console.log("No data received and no cached data available");
        // We can generate some placeholder data here if needed
      }
      
      // Update last fetch time
      setLastFetchTime(Date.now());
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
  }, [transcripts, dispatchEvent]);

  const refreshCallsTable = async (transcriptData: CallTranscript[]) => {
    try {
      // Check if we need to sync any transcripts to the calls table
      const recentTranscripts = transcriptData.filter(t => {
        // Filter for transcripts created in the last hour that might need syncing
        if (!t.created_at) return false;
        const createdTime = new Date(t.created_at).getTime();
        return Date.now() - createdTime < 3600000; // Last hour
      });
      
      for (const transcript of recentTranscripts) {
        // Check if this transcript has a corresponding entry in the calls table
        const { data, error } = await supabase
          .from('calls')
          .select('id')
          .eq('user_id', transcript.user_id)
          .eq('created_at', transcript.created_at)
          .maybeSingle();
          
        if (!data && transcript.user_id) {
          // Create a new call entry for this transcript
          await supabase
            .from('calls')
            .insert({
              user_id: transcript.user_id,
              duration: transcript.duration || 0,
              sentiment_agent: transcript.sentiment === 'positive' ? 0.8 : transcript.sentiment === 'negative' ? 0.3 : 0.5,
              sentiment_customer: transcript.sentiment === 'positive' ? 0.7 : transcript.sentiment === 'negative' ? 0.2 : 0.5,
              talk_ratio_agent: 50 + (Math.random() * 20 - 10), // Random value between 40-60
              talk_ratio_customer: 50 - (Math.random() * 20 - 10), // Random value between 40-60
              key_phrases: transcript.keywords || []
            });
        }
      }
    } catch (err) {
      console.error('Error syncing calls table:', err);
    }
  };

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
  
  // Subscribe to real-time changes from Supabase
  useEffect(() => {
    // Subscribe to real-time changes to the call_transcripts table
    const channel = supabase
      .channel('call_transcripts_changes')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public',
        table: 'call_transcripts'
      }, (payload) => {
        console.log('Real-time update received:', payload);
        
        // Dispatch appropriate event based on the change type
        if (payload.eventType === 'INSERT') {
          dispatchEvent('transcript-created', payload.new);
          // Re-fetch data to ensure all components have the latest data
          fetchTranscripts();
        } else if (payload.eventType === 'UPDATE') {
          dispatchEvent('transcript-updated', payload.new);
          // Re-fetch data to ensure all components have the latest data
          fetchTranscripts();
        } else if (payload.eventType === 'DELETE') {
          dispatchEvent('transcript-deleted', payload.old);
          // Re-fetch data to ensure all components have the latest data
          fetchTranscripts();
        }
      })
      .subscribe(status => {
        console.log('Subscription status for call_transcripts:', status);
      });
      
    // Also subscribe to changes in the calls table
    const callsChannel = supabase
      .channel('calls_changes')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public',
        table: 'calls'
      }, (payload) => {
        console.log('Real-time update received for calls:', payload);
        
        // Dispatch appropriate event based on the change type
        if (payload.eventType === 'INSERT') {
          dispatchEvent('call-created', payload.new);
        } else if (payload.eventType === 'UPDATE') {
          dispatchEvent('call-updated', payload.new);
        } else if (payload.eventType === 'DELETE') {
          dispatchEvent('call-deleted', payload.old);
        }
      })
      .subscribe(status => {
        console.log('Subscription status for calls:', status);
      });
    
    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(callsChannel);
    };
  }, [fetchTranscripts, dispatchEvent]);
  
  // Refresh data automatically every 60 seconds if the component is still mounted
  useEffect(() => {
    const intervalId = setInterval(() => {
      const now = Date.now();
      if (now - lastFetchTime > 60000) { // 60 seconds
        fetchTranscripts();
      }
    }, 60000);
    
    return () => clearInterval(intervalId);
  }, [fetchTranscripts, lastFetchTime]);
  
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
