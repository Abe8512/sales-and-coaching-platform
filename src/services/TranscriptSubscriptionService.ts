import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { CallTranscript, CallTranscriptFilter } from './CallTranscriptService';
import { EventType } from './events/types';
import { toast } from 'sonner';
import { errorHandler } from './ErrorHandlingService';

// Reconnection configuration
const RECONNECT_BASE_DELAY = 1000; // Start with 1 second
const RECONNECT_MAX_DELAY = 30000; // Max 30 seconds
const RECONNECT_MAX_ATTEMPTS = 10; // Maximum number of reconnection attempts
const RECONNECT_RESET_TIMEOUT = 60000; // Reset attempt counter after 60 seconds of stability

// Setup real-time subscriptions for transcript changes with improved error handling and reconnection
export const useTranscriptRealtimeSubscriptions = (
  isConnected: boolean,
  fetchTranscripts: (filters?: CallTranscriptFilter) => Promise<void>,
  dispatchEvent: (type: EventType, data?: any) => void
) => {
  // Keep track of subscription attempts and state
  const reconnectAttemptsRef = useRef(0);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const resetAttemptsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSubscribeTimeRef = useRef<number>(0);
  const isSubscribedRef = useRef<boolean>(false);
  
  useEffect(() => {
    if (!isConnected) {
      console.log('Skipping realtime setup - not connected to Supabase');
      
      // Clean up any existing timeouts when disconnected
      cleanupTimeouts();
      return;
    }
    
    console.log('Setting up realtime subscriptions for call_transcripts table...');
    
    // Setup channel with reconnection logic
    setupRealtimeChannel();
    
    // Cleanup function
    return () => {
      console.log('Cleaning up real-time subscriptions...');
      cleanupTimeouts();
      
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
        isSubscribedRef.current = false;
      }
    };
  }, [isConnected, fetchTranscripts, dispatchEvent]);
  
  // Helper function to clean up all timeouts
  const cleanupTimeouts = () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (resetAttemptsTimeoutRef.current) {
      clearTimeout(resetAttemptsTimeoutRef.current);
      resetAttemptsTimeoutRef.current = null;
    }
  };
  
  // Setup realtime channel with reconnection logic
  const setupRealtimeChannel = () => {
    const now = Date.now();
    const timeSinceLastSubscribe = now - lastSubscribeTimeRef.current;
    
    // Track subscription time for backoff calculations
    lastSubscribeTimeRef.current = now;
    
    // If previously subscribed, increment the attempt counter
    if (isSubscribedRef.current) {
      reconnectAttemptsRef.current += 1;
      console.log(`Reconnection attempt #${reconnectAttemptsRef.current}`);
    }
    
    // If we've exceeded max attempts, wait longer before trying again
    if (reconnectAttemptsRef.current >= RECONNECT_MAX_ATTEMPTS) {
      console.warn(`Maximum reconnection attempts (${RECONNECT_MAX_ATTEMPTS}) reached, waiting longer...`);
      
      // Wait for max delay before allowing retries again
      reconnectTimeoutRef.current = setTimeout(() => {
        console.log('Resetting reconnection attempts counter after cooling off period');
        reconnectAttemptsRef.current = 0;
        reconnectTimeoutRef.current = null;
        
        // Try again if still connected
        if (isConnected) {
          setupRealtimeChannel();
        }
      }, RECONNECT_MAX_DELAY * 2);
      
      return;
    }
    
    // If we already have a channel, clean it up first
    if (channelRef.current) {
      console.log('Removing existing channel before creating a new one');
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    
    // Create new channel with attempt count to ensure unique channel
    const channelName = `transcript-changes-${Date.now()}-${reconnectAttemptsRef.current}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'call_transcripts'
        },
        (payload) => {
          console.log('Received real-time INSERT event for call_transcripts:', payload);
          
          // Validate payload has the expected structure
          if (payload && 
              payload.new && 
              typeof payload.new === 'object' && 
              'id' in payload.new) {
            
            const newTranscript = payload.new as CallTranscript;
            console.log('New transcript:', newTranscript);
            
            // Show notification to user
            toast.success('New transcript created', {
              description: `A new transcript has been added: ${payload.new.filename || 'Unknown file'}`,
              duration: 4000,
            });
            
            // Dispatch event for new transcript
            dispatchEvent('transcript-created', newTranscript);
            
            // Refresh data to include the new transcript
            // Using debounce logic inside fetchTranscripts
            fetchTranscripts().catch(err => {
              console.error('Error fetching transcripts after INSERT event:', err);
              errorHandler.handleError({
                message: 'Failed to refresh transcripts after new addition',
                technical: err,
                severity: 'warning',
                code: 'TRANSCRIPT_INSERT_REFRESH_ERROR',
                actionable: true,
                retry: () => fetchTranscripts()
              }, 'TranscriptSubscriptionService.INSERT');
            });
          } else {
            console.warn('Received invalid payload format for call_transcripts INSERT:', payload);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'call_transcripts'
        },
        (payload) => {
          console.log('Received real-time UPDATE event for call_transcripts:', payload);
          
          // Validate payload has the expected structure
          if (payload && 
              payload.new && 
              typeof payload.new === 'object' && 
              'id' in payload.new) {
            
            const updatedTranscript = payload.new as CallTranscript;
            console.log('Updated transcript:', updatedTranscript);
            
            // Dispatch event for updated transcript
            dispatchEvent('transcript-updated', updatedTranscript);
            
            // Refresh data if needed - use existing debounce in fetch
            fetchTranscripts().catch(err => {
              console.error('Error fetching transcripts after UPDATE event:', err);
              errorHandler.handleError({
                message: 'Failed to refresh transcripts after update',
                technical: err,
                severity: 'warning',
                code: 'TRANSCRIPT_UPDATE_REFRESH_ERROR',
                actionable: true,
                retry: () => fetchTranscripts()
              }, 'TranscriptSubscriptionService.UPDATE');
            });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'call_transcripts'
        },
        (payload) => {
          console.log('Received real-time DELETE event for call_transcripts:', payload);
          
          // For delete events, the data is in payload.old
          if (payload && 
              payload.old && 
              typeof payload.old === 'object' && 
              'id' in payload.old) {
            
            const deletedTranscriptId = payload.old.id;
            console.log('Deleted transcript ID:', deletedTranscriptId);
            
            // Show notification to user
            toast.info('Transcript deleted', {
              description: `Transcript ID: ${deletedTranscriptId}`,
              duration: 4000,
            });
            
            // Dispatch event for deleted transcript
            dispatchEvent('transcript-deleted', { id: deletedTranscriptId });
            
            // Refresh data to remove the deleted transcript
            fetchTranscripts().catch(err => {
              console.error('Error fetching transcripts after DELETE event:', err);
              errorHandler.handleError({
                message: 'Failed to refresh transcripts after deletion',
                technical: err,
                severity: 'warning',
                code: 'TRANSCRIPT_DELETE_REFRESH_ERROR',
                actionable: true,
                retry: () => fetchTranscripts()
              }, 'TranscriptSubscriptionService.DELETE');
            });
          }
        }
      )
      .subscribe((status) => {
        console.log(`Real-time subscription status (${channelName}):`, status);
        
        if (status === 'SUBSCRIBED') {
          console.log('Successfully subscribed to real-time updates');
          isSubscribedRef.current = true;
          
          // Reset reconnection attempts after successful connection
          if (reconnectAttemptsRef.current > 0) {
            // Reset the counter after a period of stability
            if (resetAttemptsTimeoutRef.current) {
              clearTimeout(resetAttemptsTimeoutRef.current);
            }
            
            resetAttemptsTimeoutRef.current = setTimeout(() => {
              console.log('Connection has been stable, resetting reconnection attempts counter');
              reconnectAttemptsRef.current = 0;
              resetAttemptsTimeoutRef.current = null;
            }, RECONNECT_RESET_TIMEOUT);
          }
          
          // Clear any pending reconnection attempts
          if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = null;
          }
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          console.error(`Subscription ${channelName} closed or errored with status:`, status);
          isSubscribedRef.current = false;
          
          // On connection issues, try to reconnect after a delay with exponential backoff
          // But only if still connected to Supabase overall
          if (isConnected && !reconnectTimeoutRef.current) {
            // Calculate backoff time based on the number of attempts
            const backoffDelay = Math.min(
              RECONNECT_BASE_DELAY * Math.pow(2, reconnectAttemptsRef.current),
              RECONNECT_MAX_DELAY
            );
            
            console.log(`Will attempt to reconnect in ${backoffDelay/1000} seconds...`);
            
            reconnectTimeoutRef.current = setTimeout(() => {
              console.log('Attempting to reestablish real-time connection...');
              setupRealtimeChannel();
              reconnectTimeoutRef.current = null;
            }, backoffDelay);
          }
        }
      });
    
    // Store the channel reference so we can clean it up later
    channelRef.current = channel;
    return channel;
  };
};
