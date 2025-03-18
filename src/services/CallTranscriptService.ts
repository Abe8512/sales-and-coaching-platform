import { supabase, checkSupabaseConnection, generateAnonymousUserId } from "@/integrations/supabase/client";
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
import { withErrorHandling } from './ErrorHandlingService';
import { connectionMonitor } from './ConnectionMonitorService';
import { PostgrestError, PostgrestSingleResponse } from '@supabase/supabase-js';

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
    const id = uuidv4(); // Use proper UUID format for all IDs
    const anonymousId = generateAnonymousUserId();
    const randomSentiment = sentiments[Math.floor(Math.random() * sentiments.length)];
    const randomDate = new Date();
    randomDate.setDate(randomDate.getDate() - Math.floor(Math.random() * 30));
    
    demoData.push({
      id,
      user_id: anonymousId,
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
  
  console.log('Generated demo transcripts with proper UUIDs:', demoData);
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
  
  // Monitor connection status for the service
  useEffect(() => {
    // Initial connection check
    connectionMonitor.checkConnection().then(setIsConnected);
    
    // Subscribe to connection status changes
    const unsubscribe = connectionMonitor.subscribe(setIsConnected);
    
    return () => {
      unsubscribe();
    };
  }, []);
  
  // Check connection status on mount
  useEffect(() => {
    const checkConnection = async () => {
      console.log('Checking initial Supabase connection...');
      const { connected, error } = await checkSupabaseConnection();
      console.log('Initial connection check result:', { connected, error });
      setIsConnected(connected);
      if (!connected) {
        console.log("Using demo data due to connection issues");
        const demoData = generateDemoTranscripts(15);
        setTranscripts(demoData);
        toast.warning("Using demo data", {
          description: "Could not connect to the database. Using sample data instead."
        });
      } else {
        toast.success("Connected to database", {
          description: "Successfully connected to the Supabase database"
        });
      }
    };
    
    checkConnection();
  }, []);
  
  const fetchTranscripts = useCallback(async (filters?: CallTranscriptFilter) => {
    setLoading(true);
    setError(null);
    
    try {
      // First, check connection to Supabase
      console.log('Checking Supabase connection before fetching transcripts...');
      const isConnectionActive = await connectionMonitor.checkConnection();
      
      // If we're not connected, use demo data
      if (!isConnectionActive) {
        console.log("Using demo data due to connection issues");
        const demoData = generateDemoTranscripts(15);
        setTranscripts(demoData);
        setTotalCount(demoData.length);
        setLastFetchTime(Date.now());
        setLoading(false);
        setIsConnected(false);
        return;
      }
      
      setIsConnected(true);
      
      // Get total count first - using a safer approach that won't trigger a 400 error
      try {
        console.log('Fetching transcript count...');
        const { count, error: countError } = await withErrorHandling(
          async () => {
            const countQuery = supabase
              .from('call_transcripts')
              .select('id', { count: 'exact' });
            
            // Apply filters to count query
            if (filters?.userId && filters.userId.trim() !== '') {
              countQuery.eq('user_id', filters.userId);
            }
            
            if (filters?.userIds && filters.userIds.length > 0) {
              countQuery.in('user_id', filters.userIds);
            }
            
            if (filters?.dateRange?.from) {
              const fromDate = new Date(filters.dateRange.from);
              fromDate.setHours(0, 0, 0, 0);
              countQuery.gte('created_at', fromDate.toISOString());
            }
            
            if (filters?.dateRange?.to) {
              const toDate = new Date(filters.dateRange.to);
              toDate.setHours(23, 59, 59, 999);
              countQuery.lte('created_at', toDate.toISOString());
            }
            
            // Execute the query and return the full response
            return await countQuery;
          },
          { data: [], count: null, error: null, status: 200, statusText: 'OK' } as PostgrestSingleResponse<{ id: string }[]>,
          'TranscriptCount'
        );
          
        if (!countError && count !== null) {
          console.log(`Found ${count} transcripts`);
          setTotalCount(count);
        } else if (countError) {
          console.error('Error getting transcript count:', countError);
        }
      } catch (countErr) {
        console.error('Exception getting transcript count:', countErr);
      }
      
      // Then get data with filters
      console.log('Building transcript query with filters:', filters);
      
      const { data, error: dataError } = await withErrorHandling(
        async () => {
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
          
          return query.order('created_at', { ascending: false });
        },
        { data: null, error: null as PostgrestError | null, count: null, status: 200, statusText: 'OK' } as PostgrestSingleResponse<CallTranscript[]>,
        'TranscriptFetch',
        {
          message: 'Error fetching transcript data',
          retry: () => fetchTranscripts(filters)
        }
      );
      
      // If we got actual data, use it
      if (data && data.length > 0) {
        console.log(`Setting ${data.length} transcripts to state`);
        setTranscripts(data);
        
        // Dispatch an event to notify other components that transcripts were refreshed
        dispatchEvent('transcripts-refreshed', {
          count: data.length,
          filters: filters
        });
        
        // Also update calls table to ensure metrics are fresh
        await refreshCallsTable(data);
      } else if (dataError) {
        // Show error and fall back to demo data if we have none
        console.error('Error fetching transcript data:', dataError);
        if (transcripts.length === 0) {
          const demoData = generateDemoTranscripts(15);
          setTranscripts(demoData);
        }
      } else if (transcripts.length === 0) {
        // No error but no data either, and we don't have any cached data
        console.log("No data received and no cached data available, generating demo data");
        const demoData = generateDemoTranscripts(15);
        setTranscripts(demoData);
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
        const demoData = generateDemoTranscripts(15);
        setTranscripts(demoData);
      }
    } finally {
      setLoading(false);
    }
  }, [transcripts, dispatchEvent, isConnected]);

  const refreshCallsTable = async (transcriptData: CallTranscript[]) => {
    if (!isConnected) return;
    
    try {
      console.log('Refreshing calls table...');
      // Check if we need to sync any transcripts to the calls table
      const recentTranscripts = transcriptData.filter(t => {
        // Filter for transcripts created in the last hour that might need syncing
        if (!t.created_at) return false;
        const createdTime = new Date(t.created_at).getTime();
        return Date.now() - createdTime < 3600000; // Last hour
      });
      
      console.log(`Found ${recentTranscripts.length} recent transcripts to sync`);
      
      for (const transcript of recentTranscripts) {
        try {
          // Skip if missing critical data
          if (!transcript.created_at) continue;
          
          // Make sure we have a valid user_id - use the existing one or generate a new anonymous ID
          const userId = transcript.user_id || generateAnonymousUserId();
          
          console.log(`Processing transcript ${transcript.id} for user ${userId}`);
          
          try {
            // Check if a call record for this transcript already exists
            const { data } = await supabase
              .from('calls')
              .select('id')
              .eq('id', transcript.id)
              .maybeSingle();
              
            if (!data) {
              console.log(`Creating new call record for transcript ${transcript.id}`);
              
              // Create a new call entry with the same ID as the transcript for consistency
              const { error: insertError } = await supabase
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
                
              if (insertError) {
                console.error(`Error creating call record for transcript ${transcript.id}:`, insertError);
              } else {
                console.log(`Successfully created call record for transcript ${transcript.id}`);
              }
            } else {
              console.log(`Call record already exists for transcript ${transcript.id}`);
            }
          } catch (callError) {
            console.error(`Error checking/creating call record for transcript ${transcript.id}:`, callError);
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

  // Subscribe to real-time changes from Supabase with improved error handling
  useEffect(() => {
    if (!isConnected) return;
    
    let retryTimeout: number | null = null;
    
    const setupSubscriptions = () => {
      try {
        // Subscribe to real-time changes to the call_transcripts table
        console.log('Setting up Supabase real-time subscriptions...');
        
        const channel = supabase
          .channel('call_transcripts_changes')
          .on('postgres_changes', { 
            event: '*', 
            schema: 'public',
            table: 'call_transcripts'
          }, (payload) => {
            console.log('Real-time update received:', payload);
            
            // Validate the received payload has proper format and valid UUID
            if (payload && payload.new && typeof payload.new === 'object' && 'id' in payload.new && typeof payload.new.id === 'string') {
              try {
                // Simple validation that the ID looks like a UUID
                if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(payload.new.id)) {
                  console.error('Received payload with invalid UUID format:', payload.new.id);
                  return;
                }
                
                // Dispatch appropriate event based on the change type
                if (payload.eventType === 'INSERT') {
                  dispatchEvent('transcript-created', payload.new);
                  // Re-fetch data to ensure all components have the latest data
                  fetchTranscripts();
                } else if (payload.eventType === 'UPDATE') {
                  dispatchEvent('transcript-updated', payload.new);
                  // Re-fetch data to ensure all components have the latest data
                  fetchTranscripts();
                } else if (payload.eventType === 'DELETE' && payload.old && typeof payload.old === 'object' && 'id' in payload.old) {
                  dispatchEvent('transcript-deleted', payload.old);
                  // Re-fetch data to ensure all components have the latest data
                  fetchTranscripts();
                }
              } catch (parseError) {
                console.error('Error processing real-time update:', parseError);
              }
            }
          })
          .subscribe(status => {
            console.log('Subscription status for call_transcripts:', status);
            if (status === 'SUBSCRIBED') {
              console.log('Successfully subscribed to call_transcripts table');
            } else if (status === 'CHANNEL_ERROR') {
              console.error('Error subscribing to call_transcripts table');
              // Attempt to reconnect after delay
              if (retryTimeout) clearTimeout(retryTimeout);
              retryTimeout = window.setTimeout(setupSubscriptions, 5000);
            }
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
            
            // Validate the received payload has proper format and valid UUID
            const hasValidNewId = payload && payload.new && typeof payload.new === 'object' && 'id' in payload.new;
            const hasValidOldId = payload && payload.old && typeof payload.old === 'object' && 'id' in payload.old;
            
            if (hasValidNewId || hasValidOldId) {
              try {
                // Dispatch appropriate event based on the change type
                if (payload.eventType === 'INSERT' && hasValidNewId) {
                  dispatchEvent('call-created', payload.new);
                } else if (payload.eventType === 'UPDATE' && hasValidNewId) {
                  dispatchEvent('call-updated', payload.new);
                } else if (payload.eventType === 'DELETE' && hasValidOldId) {
                  dispatchEvent('call-deleted', payload.old);
                }
              } catch (parseError) {
                console.error('Error processing real-time call update:', parseError);
              }
            }
          })
          .subscribe(status => {
            console.log('Subscription status for calls:', status);
            if (status === 'SUBSCRIBED') {
              console.log('Successfully subscribed to calls table');
            }
          });
        
        return () => {
          console.log('Cleaning up Supabase subscriptions...');
          if (retryTimeout) clearTimeout(retryTimeout);
          supabase.removeChannel(channel);
          supabase.removeChannel(callsChannel);
        };
      } catch (err) {
        console.error('Error setting up Supabase subscriptions:', err);
        // Attempt to reconnect after delay
        if (retryTimeout) clearTimeout(retryTimeout);
        retryTimeout = window.setTimeout(setupSubscriptions, 5000);
        return () => {
          if (retryTimeout) clearTimeout(retryTimeout);
        };
      }
    };
    
    const cleanup = setupSubscriptions();
    return cleanup;
  }, [fetchTranscripts, dispatchEvent, isConnected]);
  
  // Refresh data automatically every 60 seconds if the component is still mounted
  useEffect(() => {
    const intervalId = setInterval(() => {
      const now = Date.now();
      // Only attempt to refresh if we're believed to be connected and it's been at least 60 seconds
      if (isConnected && now - lastFetchTime > 60000) { // 60 seconds
        fetchTranscripts();
      }
    }, 60000);
    
    return () => clearInterval(intervalId);
  }, [fetchTranscripts, lastFetchTime, isConnected]);
  
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
