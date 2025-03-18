import { create } from 'zustand';
import { CallMetricsState } from './types';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { SentimentData } from '@/types/call';
import { EventType, useEventsStore } from '@/services/events';

const initialCallState = {
  startTime: null,
  endTime: null,
  duration: 0,
  agentTalkTime: 0,
  customerTalkTime: 0,
  agentInterruptions: 0,
  customerInterruptions: 0,
  keyPhrases: [],
  sentiment: { agent: 0.5, customer: 0.5 },
  sentimentTrend: [],
  transcript: '',
  recordingUrl: '',
  recordingId: null,
  isRecording: false,
  isCallEnded: false,
  callScore: 0,
  outcome: '',
  summary: '',
  nextSteps: '',
  feedback: '',
  date: new Date().toISOString().slice(0, 10),
  talkRatio: { agent: 50, customer: 50 },
};

export const useCallMetricsStore = create<CallMetricsState>((set, get) => ({
  ...initialCallState,
  callHistory: [],
  isLoading: false,
  error: null,
  
  startRecording: () => {
    set({ 
      ...initialCallState,
      startTime: new Date(), 
      isRecording: true,
      date: new Date().toISOString().slice(0, 10)
    });
  },
  
  stopRecording: async () => {
    const endTime = new Date();
    const startTime = get().startTime;
    const duration = startTime ? (endTime.getTime() - startTime.getTime()) / 1000 : 0;
    
    set({ 
      endTime, 
      duration, 
      isRecording: false,
      isCallEnded: true
    });
    
    await get().saveCallMetrics();
  },
  
  resetCallState: () => {
    set(initialCallState);
  },
  
  updateCallMetrics: (metrics) => {
    set(metrics);
  },
  
  saveSentimentTrend: () => {
    const currentSentiment = get().sentiment;
    const sentimentTrend = get().sentimentTrend;
    
    const newSentiment = {
      time: new Date().toLocaleTimeString(),
      agent: currentSentiment.agent,
      customer: currentSentiment.customer
    };
    
    set({ sentimentTrend: [...sentimentTrend, newSentiment] });
  },
  
  setRecordingUrl: (recordingUrl) => {
    set({ recordingUrl });
  },
  
  setRecordingId: (recordingId) => {
    set({ recordingId });
  },
  
  saveCallMetrics: async () => {
    set({ isLoading: true, error: null });
    
    try {
      const { user } = useAuth.getState();
      const {
        startTime,
        endTime,
        duration,
        agentTalkTime,
        customerTalkTime,
        agentInterruptions,
        customerInterruptions,
        keyPhrases,
        sentiment,
        sentimentTrend,
        transcript,
        recordingUrl,
        recordingId,
        callScore,
        outcome,
        summary,
        nextSteps,
        feedback,
        date,
        talkRatio
      } = get();
      
      if (!user || !startTime || !endTime) {
        console.error('User not authenticated or call not started.');
        set({ isLoading: false, error: 'User not authenticated or call not started.' });
        return;
      }
      
      const { data, error } = await supabase
        .from('calls')
        .insert([
          {
            user_id: user.id,
            start_time: startTime.toISOString(),
            end_time: endTime.toISOString(),
            duration,
            agent_talk_time: agentTalkTime,
            customer_talk_time: customerTalkTime,
            agent_interruptions: agentInterruptions,
            customer_interruptions: customerInterruptions,
            key_phrases: keyPhrases.map(kp => kp.text),
            sentiment,
            sentiment_trend: sentimentTrend,
            transcript,
            recording_url: recordingUrl,
            recording_id: recordingId,
            call_score: callScore,
            outcome,
            summary,
            next_steps: nextSteps,
            feedback,
            date,
            talk_ratio: talkRatio,
          },
        ])
        .select()
        .single();
      
      if (error) {
        console.error('Error saving call metrics:', error);
        set({ isLoading: false, error: error.message });
      } else {
        console.log('Call metrics saved successfully:', data);
        set({ isLoading: false, error: null });
        
        const dispatchEvent = useEventsStore.getState().dispatchEvent;
        
        dispatchEvent('recording-completed', {
          id: recordingId,
          duration,
          sentiment,
          talkRatio,
          keywords: keyPhrases.map(kp => kp.text)
        });
        
        get().loadPastCalls();
      }
    } catch (err) {
      console.error('Unexpected error saving call metrics:', err);
      set({ isLoading: false, error: 'An unexpected error occurred.' });
    }
  },
  
  loadPastCalls: async () => {
    set({ isLoading: true, error: null });
    
    try {
      const { user } = useAuth.getState();
      
      if (!user) {
        console.error('User not authenticated.');
        set({ isLoading: false, error: 'User not authenticated.' });
        return;
      }
      
      const { data, error } = await supabase
        .from('calls')
        .select('*')
        .eq('user_id', user.id)
        .order('start_time', { ascending: false });
      
      if (error) {
        console.error('Error loading past calls:', error);
        set({ isLoading: false, error: error.message });
      } else {
        console.log('Past calls loaded successfully:', data);
        set({ callHistory: data || [], isLoading: false, error: null });
      }
    } catch (err) {
      console.error('Unexpected error loading past calls:', err);
      set({ isLoading: false, error: 'An unexpected error occurred.' });
    }
  },
}));
