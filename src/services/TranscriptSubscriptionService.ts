
import { useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { EventDispatcher } from './events/types';

export const useTranscriptRealtimeSubscriptions = (
  isConnected: boolean,
  fetchTranscripts: () => void,
  dispatchEvent: EventDispatcher
) => {
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
};
