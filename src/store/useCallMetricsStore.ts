
import { create } from 'zustand';
import { CallMetricsState } from './types';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { v4 as uuidv4 } from 'uuid';
import { EventType, useEventsStore } from '@/services/events';

// Helper to safely get auth user
const getAuthUser = () => {
  let user = null;
  try {
    if (typeof useAuth === 'function') {
      // Handle both function and object cases
      const authState = typeof useAuth.getState === 'function' 
        ? useAuth.getState() 
        : useAuth();
      user = authState.user;
    }
  } catch (error) {
    console.error('Error getting auth user:', error);
  }
  return user;
};

const initialCallState = {
  startTime: null,
  endTime: null,
  duration: 0,
  callDuration: 0,
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
  isTalkingMap: { agent: false, customer: false },
  coachingAlerts: [],
  keywordsByCategory: {
    positive: [],
    neutral: [],
    negative: []
  }
};

export const useCallMetricsStore = create<CallMetricsState>((set, get) => ({
  ...initialCallState,
  callHistory: [],
  isLoading: false,
  error: null,
  
  updateKeyPhrases: (phrase) => {
    const keyPhrases = get().keyPhrases || [];
    const newKeyPhrases = [...keyPhrases, { text: phrase }];
    set({ keyPhrases: newKeyPhrases });
    get().classifyKeywords();
  },
  
  dismissAlert: (id) => {
    const coachingAlerts = get().coachingAlerts || [];
    const updatedAlerts = coachingAlerts.map(alert => 
      alert.id === id ? { ...alert, dismissed: true } : alert
    );
    set({ coachingAlerts: updatedAlerts });
  },
  
  classifyKeywords: () => {
    const keyPhrases = get().keyPhrases || [];
    const sentiment = get().sentiment;
    
    const positiveThreshold = 0.65;
    const negativeThreshold = 0.35;
    
    const keywordsByCategory = {
      positive: [] as string[],
      neutral: [] as string[],
      negative: [] as string[]
    };
    
    keyPhrases.forEach(phrase => {
      if (typeof phrase === 'string') {
        // Handle simple string case
        if (sentiment.customer > positiveThreshold) {
          keywordsByCategory.positive.push(phrase);
        } else if (sentiment.customer < negativeThreshold) {
          keywordsByCategory.negative.push(phrase);
        } else {
          keywordsByCategory.neutral.push(phrase);
        }
      } else if (phrase && typeof phrase === 'object' && 'text' in phrase) {
        // Handle object with text property
        if (phrase.category === 'positive') {
          keywordsByCategory.positive.push(phrase.text);
        } else if (phrase.category === 'negative') {
          keywordsByCategory.negative.push(phrase.text);
        } else {
          keywordsByCategory.neutral.push(phrase.text);
        }
      }
    });
    
    set({ keywordsByCategory });
  },
  
  startRecording: () => {
    const newCoachingAlert = {
      id: uuidv4(),
      type: 'info' as const,
      message: 'Call recording started. Remember to ask open-ended questions.',
      timestamp: new Date(),
      dismissed: false
    };
    
    set({ 
      ...initialCallState,
      startTime: new Date(), 
      isRecording: true,
      date: new Date().toISOString().slice(0, 10),
      coachingAlerts: [newCoachingAlert]
    });
  },
  
  stopRecording: async () => {
    const endTime = new Date();
    const startTime = get().startTime;
    const duration = startTime ? (endTime.getTime() - startTime.getTime()) / 1000 : 0;
    
    set({ 
      endTime, 
      duration, 
      callDuration: Math.floor(duration),
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
      const user = getAuthUser();
      
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
      
      const callData = {
        user_id: user.id,
        created_at: new Date().toISOString(),
        duration: duration,
        key_phrases: keyPhrases.map(kp => typeof kp === 'string' ? kp : kp.text),
        sentiment_agent: sentiment.agent,
        sentiment_customer: sentiment.customer,
        talk_ratio_agent: talkRatio.agent,
        talk_ratio_customer: talkRatio.customer
      };
      
      const { data, error } = await supabase
        .from('calls')
        .insert(callData)
        .select()
        .single();
      
      if (error) {
        console.error('Error saving call metrics:', error);
        set({ isLoading: false, error: error.message });
      } else {
        console.log('Call metrics saved successfully:', data);
        set({ isLoading: false, error: null });
        
        const dispatchEvent = useEventsStore.getState().dispatchEvent;
        
        // Type assertion to ensure compatibility
        dispatchEvent('recording-completed' as EventType, {
          id: recordingId,
          duration,
          sentiment,
          talkRatio,
          keywords: keyPhrases.map(kp => typeof kp === 'string' ? kp : kp.text)
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
      const user = getAuthUser();
      
      if (!user) {
        console.error('User not authenticated.');
        set({ isLoading: false, error: 'User not authenticated.' });
        return;
      }
      
      const { data, error } = await supabase
        .from('calls')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
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
