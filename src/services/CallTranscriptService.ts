
import { supabase, checkSupabaseConnection } from "@/integrations/supabase/client";
import { useState, useEffect, useCallback } from "react";
import { DateRange } from "react-day-picker";
import { 
  calculateTotalCalls, 
  calculateAvgSentiment, 
  calculateOutcomeDistribution 
} from "@/utils/metricCalculations";
import { toast } from "sonner";
import { useEventsStore } from "@/services/events";
import { v4 as uuidv4 } from 'uuid';

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

// Generate demo data for when the database connection fails
const generateDemoTranscripts = (count = 10): CallTranscript[] => {
  const sentiments = ['positive', 'neutral', 'negative'];
  const demoData: CallTranscript[] = [];
  
  for (let i = 0; i < count; i++) {
    const randomSentiment = sentiments[Math.floor(Math.random() * sentiments.length)];
    const randomDate = new Date();
    randomDate.setDate(randomDate.getDate() - Math.floor(Math.random() * 30));
    
    demoData.push({
      id: `demo-${i}-${Date.now()}`,
      user_id: `demo-user-${uuidv4().substring(0, 8)}`,
      filename: `call-${i}.wav`,
      text: `This is a demo transcript for call ${i}. It contains sample conversation text that would typically be generated from a real call recording.`,
      duration: Math.floor(Math.random() * 600) + 120, // 2-12 minutes
      call_score: Math.floor(Math.random() * 50) + 50, // 50-100
      sentiment: randomSentiment,
      keywords: ["product", "pricing", "follow-up", "meeting"],
      transcript_segments: null,
      created_at: randomDate.toISOString()
    });
  }
  
  return demoData;
};

export const useCallTranscriptService = () => {
  const [transcripts, setTranscripts] = useState<CallTranscript[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [lastFetchTime, setLastFetchTime] = useState<number>(0);
  const [isConnected, setIsConnected] = useState<boolean>(true);
  const dispatchEvent = useEventsStore.getState().dispatchEvent;
  
  // Check connection status on mount
  useEffect(() => {
    const checkConnection = async () => {
      const { connected } = await checkSupabaseConnection();
      setIsConnected(connected);
      if (!connected) {
        console.log("Using demo data due to connection issues");
        setTranscripts(generateDemoTranscripts(15));
      }
    };
    
    checkConnection();
  }, []);
  
  const fetchTranscripts = useCallback(async (filters?: CallTranscriptFilter) => {
    setLoading(true);
    setError(null);
    
    try {
      // If we're not connected, use demo data
      if (!isConnected) {
        console.log("Using demo data due to connection issues");
        const demoData = generateDemoTranscripts(15);
        setTranscripts(demoData);
        setTotalCount(demoData.length);
        setLastFetchTime(Date.now());
        setLoading(false);
        return;
      }
      
      // First, check connection to Supabase
      try {
        const { connected, error } = await checkSupabaseConnection();
        
        if (!connected) {
          console.log("Connection error:", error);
          // Use demo data if we can't connect
          if (transcripts.length === 0) {
            const demoData = generateDemoTranscripts(15);
            setTranscripts(demoData);
            setTotalCount(demoData.length);
          }
          setLoading(false);
          return;
        }
      } catch (connErr) {
        console.log("Connection test failed:", connErr);
        // Use demo data if we can't connect
        if (transcripts.length === 0) {
          const demoData = generateDemoTranscripts(15);
          setTranscripts(demoData);
          setTotalCount(demoData.length);
        }
        setLoading(false);
        return;
      }
      
      // Get total count first - using a safer approach that won't trigger a 400 error
      try {
        const countQuery = supabase
          .from('call_transcripts')
          .select('id', { count: 'exact' });
        
        const { count, error: countError } = await countQuery;
          
        if (!countError && count !== null) {
          setTotalCount(count);
        }
      } catch (countErr) {
        console.error('Error getting count:', countErr);
      }
      
      // Then get data with filters
      let query = supabase
        .from('call_transcripts')
        .select('*');
      
      // Apply filters
      if (filters?.userId && filters.userId.trim() !== '') {
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
      
      // Get data with timeout protection
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
          resolve(transcripts.length ? [...transcripts] : generateDemoTranscripts(15));
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
        setTranscripts(generateDemoTranscripts(15));
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
          description: "Using cached or demo data. Check your connection."
        });
        setTranscripts(generateDemoTranscripts(15));
      }
    } finally {
      setLoading(false);
    }
  }, [transcripts, dispatchEvent, isConnected]);

  const refreshCallsTable = async (transcriptData: CallTranscript[]) => {
    if (!isConnected) return;
    
    try {
      // Check if we need to sync any transcripts to the calls table
      const recentTranscripts = transcriptData.filter(t => {
        // Filter for transcripts created in the last hour that might need syncing
        if (!t.created_at) return false;
        const createdTime = new Date(t.created_at).getTime();
        return Date.now() - createdTime < 3600000; // Last hour
      });
      
      for (const transcript of recentTranscripts) {
        try {
          // Skip if missing critical data
          if (!transcript.created_at) continue;
          
          // Make sure we have a valid user_id
          const userId = transcript.user_id || `anonymous-${uuidv4().substring(0, 8)}`;
          
          try {
            // Check if a call record for this transcript already exists
            const { data } = await supabase
              .from('calls')
              .select('id')
              .eq('id', transcript.id)
              .maybeSingle();
              
            if (!data) {
              // Create a new call entry with the same ID as the transcript for consistency
              await supabase
                .from('calls')
                .insert({
                  id: transcript.id,
                  user_id: userId,
                  duration: transcript.duration || 0,
                  sentiment_agent: transcript.sentiment === 'positive' ? 0.8 : transcript.sentiment === 'negative' ? 0.3 : 0.5,
                  sentiment_customer: transcript.sentiment === 'positive' ? 0.7 : transcript.sentiment === 'negative' ? 0.2 : 0.5,
                  talk_ratio_agent: 50 + (Math.random() * 20 - 10), // Random value between 40-60
                  talk_ratio_customer: 50 - (Math.random() * 20 - 10), // Random value between 40-60
                  key_phrases: transcript.keywords || []
                });
            }
          } catch (callError) {
            console.error('Error checking/creating call record:', callError);
            // Continue with next transcript even if one fails
          }
        } catch (trError) {
          console.error('Error processing transcript:', trError);
          // Continue with next transcript even if one fails
        }
      }
    } catch (err) {
      console.error('Error syncing calls table:', err);
    }
  };

  const getMetrics = (transcriptData: CallTranscript[] = []) => {
    // Use provided data or current state
    const dataToUse = transcriptData.length > 0 ? transcriptData : transcripts;
    
    // If no transcripts, provide reasonable defaults
    if (dataToUse.length === 0) {
      return {
        totalCalls: 0,
        avgSentiment: 0.5,
        outcomeStats: [],
        conversionRate: 0
      };
    }
    
    const totalCalls = calculateTotalCalls(dataToUse);
    const avgSentiment = calculateAvgSentiment(dataToUse);
    const outcomeStats = calculateOutcomeDistribution(dataToUse);
    
    const positiveOutcomes = outcomeStats.filter(o => 
      o.outcome === 'Qualified Lead' || 
      o.outcome === 'Meeting Scheduled' || 
      o.outcome === 'Demo Scheduled'
    );
    
    const successfulCalls = positiveOutcomes.reduce((sum, o) => sum + (o.count || 0), 0);
    const conversionRate = totalCalls > 0 ? (successfulCalls / totalCalls) * 100 : 0;
    
    return {
      totalCalls,
      avgSentiment,
      outcomeStats,
      conversionRate
    };
  };

  const getCallDistributionData = (transcriptData: CallTranscript[] = []) => {
    // Use provided data or current state
    const dataToUse = transcriptData.length > 0 ? transcriptData : transcripts;
    
    // If no transcripts, return empty array
    if (dataToUse.length === 0) {
      return [];
    }
    
    const userCalls: Record<string, number> = {};
    
    dataToUse.forEach(transcript => {
      // Use filename as fallback for user name if user_id doesn't map to a name
      const userName = transcript.filename?.split('.')[0] || 'Unknown';
      
      if (!userCalls[userName]) {
        userCalls[userName] = 0;
      }
      userCalls[userName] += 1;
    });
    
    return Object.entries(userCalls).map(([name, calls]) => ({
      name,
      calls: calls as number
    }));
  };

  // Subscribe to real-time changes from Supabase
  useEffect(() => {
    if (!isConnected) return;
    
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
  }, [fetchTranscripts, dispatchEvent, isConnected]);
  
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
  }, [fetchTranscripts]);
  
  return {
    transcripts,
    loading,
    error,
    totalCount,
    fetchTranscripts,
    getMetrics,
    getCallDistributionData,
    isConnected
  };
};
