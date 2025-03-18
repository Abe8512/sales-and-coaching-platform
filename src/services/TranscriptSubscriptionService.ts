import { useEffect, useRef } from 'react';
import { supabase, isConnected } from '@/integrations/supabase/client';
import { CallTranscript, CallTranscriptFilter } from './CallTranscriptService';
import { EventType } from './events/types';
import { toast } from 'sonner';
import { errorHandler } from './ErrorHandlingService';

// Setup real-time subscriptions for transcript changes with improved error handling and reconnection
export const useTranscriptRealtimeSubscriptions = (
  isConnected: boolean,
  fetchTranscripts: (filters?: CallTranscriptFilter) => Promise<void>,
  dispatchEvent: (type: EventType, data?: any) => void
) => {
  // Keep track of subscription attempts
  const subscriptionAttemptsRef = useRef(0);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  
  useEffect(() => {
    if (!isConnected) {
      console.log('Skipping realtime setup - not connected to Supabase');
      return;
    }
    
    console.log('Setting up realtime subscriptions for call_transcripts table...');
    subscriptionAttemptsRef.current += 1;
    
    // Create a subscription channel with automatic reconnection
    const setupChannel = () => {
      // If we already have a channel, clean it up first
      if (channelRef.current) {
        console.log('Removing existing channel before creating a new one');
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      
      // Create new channel with name that includes attempt count to ensure unique channel
      const channelName = `schema-db-changes-${subscriptionAttemptsRef.current}`;
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
                errorHandler.handleError(err, 'TranscriptSubscriptionService.INSERT');
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
                errorHandler.handleError(err, 'TranscriptSubscriptionService.UPDATE');
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
                errorHandler.handleError(err, 'TranscriptSubscriptionService.DELETE');
              });
            }
          }
        )
        .subscribe((status) => {
          console.log(`Real-time subscription status (${channelName}):`, status);
          
          if (status === 'SUBSCRIBED') {
            console.log('Successfully subscribed to real-time updates');
          } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
            console.error(`Subscription ${channelName} closed or errored with status:`, status);
            
            // On connection issues, try to reconnect after a delay
            // But only if still connected to Supabase overall
            if (isConnected()) {
              console.log('Will attempt to reconnect in 3 seconds...');
              setTimeout(() => {
                console.log('Attempting to reestablish real-time connection...');
                setupChannel();
              }, 3000);
            }
          }
        });
      
      // Store the channel reference so we can clean it up later
      channelRef.current = channel;
      return channel;
    };
    
    // Initial setup
    const channel = setupChannel();
    
    // Clean up subscription on unmount or when connection status changes
    return () => {
      console.log('Cleaning up real-time subscriptions...');
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [isConnected, fetchTranscripts, dispatchEvent]);
};
