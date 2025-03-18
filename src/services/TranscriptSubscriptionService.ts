
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { CallTranscript, CallTranscriptFilter } from './CallTranscriptService';
import { EventType } from './events/types';

// Setup real-time subscriptions for transcript changes
export const useTranscriptRealtimeSubscriptions = (
  isConnected: boolean,
  fetchTranscripts: (filters?: CallTranscriptFilter) => Promise<void>,
  dispatchEvent: (type: EventType, data?: any) => void
) => {
  useEffect(() => {
    if (!isConnected) return;
    
    console.log('Setting up realtime subscriptions for call_transcripts table...');
    
    // Create a subscription channel
    const channel = supabase
      .channel('schema-db-changes')
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
            
            // Dispatch event for new transcript
            dispatchEvent('transcript-created', newTranscript);
            
            // Refresh data to include the new transcript
            fetchTranscripts().catch(err => {
              console.error('Error fetching transcripts after INSERT event:', err);
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
            
            // Refresh data if needed
            fetchTranscripts().catch(err => {
              console.error('Error fetching transcripts after UPDATE event:', err);
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
            
            // Dispatch event for deleted transcript
            dispatchEvent('transcript-deleted', { id: deletedTranscriptId });
            
            // Refresh data to remove the deleted transcript
            fetchTranscripts().catch(err => {
              console.error('Error fetching transcripts after DELETE event:', err);
            });
          }
        }
      )
      .subscribe((status) => {
        console.log('Real-time subscription status:', status);
      });
    
    // Clean up subscription on unmount
    return () => {
      console.log('Cleaning up real-time subscriptions...');
      supabase.removeChannel(channel);
    };
  }, [isConnected, fetchTranscripts, dispatchEvent]);
};
