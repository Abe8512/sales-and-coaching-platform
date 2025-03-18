import { create } from 'zustand';
import { supabase } from "@/integrations/supabase/client";
import { validateDataConsistency } from '@/services/SharedDataService';
import { useEventsStore } from '@/services/events';
import { v4 as uuidv4 } from 'uuid';

interface CallMetricsState {
  isRecording: boolean;
  callDuration: number;
  talkRatio: { agent: number; customer: number };
  sentiment: { agent: number; customer: number };
  isTalkingMap: { agent: boolean; customer: boolean };
  keyPhrases: string[];
  socketConnected: boolean;
  recordingStartTime: number | null;
  callHistory: CallHistoryItem[];
  coachingAlerts: CoachingAlert[];
  keywordsByCategory: KeywordCategories;
  
  // Actions
  startRecording: () => void;
  stopRecording: () => void;
  updateMetrics: (data: Partial<CallMetricsState>) => void;
  updateKeyPhrases: (phrase: string) => void;
  toggleSpeaking: (speaker: 'agent' | 'customer', isSpeaking: boolean) => void;
  savePastCall: () => void;
  loadPastCalls: () => void;
  checkCoachingAlerts: () => void;
  dismissAlert: (id: string) => void;
  classifyKeywords: () => void;
  saveSentimentTrend: () => Promise<void>;
}

interface CallHistoryItem {
  id: string;
  date: string;
  duration: number;
  talkRatio: { agent: number; customer: number };
  sentiment: { agent: number; customer: number };
  keyPhrases: string[];
}

interface CoachingAlert {
  id: string;
  type: 'warning' | 'info' | 'critical';
  message: string;
  timestamp: number;
  dismissed: boolean;
}

interface KeywordCategories {
  positive: string[];
  neutral: string[];
  negative: string[];
}

export const useCallMetricsStore = create<CallMetricsState>((set, get) => {
  let durationTimer: NodeJS.Timeout | null = null;
  let speakingSimulationTimer: NodeJS.Timeout | null = null;
  let alertCheckTimer: NodeJS.Timeout | null = null;
  
  const initializeSocketConnection = () => {
    set({ socketConnected: true });
    return () => {
      if (durationTimer) clearInterval(durationTimer);
      if (speakingSimulationTimer) clearInterval(speakingSimulationTimer);
      if (alertCheckTimer) clearInterval(alertCheckTimer);
    };
  };
  
  initializeSocketConnection();
  
  return {
    isRecording: false,
    callDuration: 0,
    talkRatio: { agent: 50, customer: 50 },
    sentiment: { agent: 0.7, customer: 0.5 },
    isTalkingMap: { agent: false, customer: false },
    keyPhrases: [],
    socketConnected: false,
    recordingStartTime: null,
    callHistory: [],
    coachingAlerts: [],
    keywordsByCategory: { positive: [], neutral: [], negative: [] },
    
    startRecording: () => {
      const startTime = Date.now();
      set({ 
        isRecording: true, 
        callDuration: 0,
        recordingStartTime: startTime,
        keyPhrases: [],
        coachingAlerts: [],
        keywordsByCategory: { positive: [], neutral: [], negative: [] }
      });
      
      durationTimer = setInterval(() => {
        const { recordingStartTime } = get();
        if (recordingStartTime) {
          const duration = Math.floor((Date.now() - recordingStartTime) / 1000);
          set({ callDuration: duration });
        }
      }, 1000);
      
      speakingSimulationTimer = setInterval(() => {
        if (Math.random() > 0.7) {
          const agentSpeaking = Math.random() > 0.5;
          const customerSpeaking = Math.random() > 0.5;
          
          set({ 
            isTalkingMap: { 
              agent: agentSpeaking, 
              customer: customerSpeaking 
            }
          });
          
          set(state => {
            const agentShift = Math.random() * 2 - 1;
            return {
              talkRatio: {
                agent: Math.max(20, Math.min(80, state.talkRatio.agent + agentShift)),
                customer: Math.max(20, Math.min(80, state.talkRatio.customer - agentShift))
              },
              sentiment: {
                agent: Math.max(0, Math.min(1, state.sentiment.agent + (Math.random() * 0.1 - 0.05))),
                customer: Math.max(0, Math.min(1, state.sentiment.customer + (Math.random() * 0.1 - 0.05)))
              }
            };
          });
          
          if (Math.random() > 0.9) {
            const phrases = [
              "pricing options",
              "contract terms",
              "delivery timeline",
              "feature request",
              "technical support",
              "customer satisfaction",
              "follow-up meeting",
              "product quality",
              "discount request",
              "competitive offer"
            ];
            const randomPhrase = phrases[Math.floor(Math.random() * phrases.length)];
            get().updateKeyPhrases(randomPhrase);
            get().classifyKeywords();
          }
        }
      }, 2000);
      
      alertCheckTimer = setInterval(() => {
        get().checkCoachingAlerts();
      }, 5000);
    },
    
    stopRecording: () => {
      if (durationTimer) clearInterval(durationTimer);
      if (speakingSimulationTimer) clearInterval(speakingSimulationTimer);
      if (alertCheckTimer) clearInterval(alertCheckTimer);
      
      if (get().isRecording) {
        get().savePastCall();
      }
      
      set({ 
        isRecording: false,
        isTalkingMap: { agent: false, customer: false },
        recordingStartTime: null,
        coachingAlerts: []
      });
      
      // Dispatch event that recording completed
      useEventsStore.getState().dispatchEvent('recording-completed', {
        duration: get().callDuration,
        sentiment: get().sentiment
      });
    },
    
    updateMetrics: (data) => {
      set({ ...data });
      
      // Validate data consistency
      if (data.talkRatio) {
        validateDataConsistency('useCallMetricsStore', {
          avgTalkRatio: data.talkRatio
        });
      }
      
      if (data.sentiment) {
        validateDataConsistency('useCallMetricsStore', {
          avgSentiment: (data.sentiment.agent + data.sentiment.customer) / 2
        });
      }
    },
    
    updateKeyPhrases: (phrase) => {
      set(state => ({
        keyPhrases: [...new Set([...state.keyPhrases, phrase])]
      }));
    },
    
    toggleSpeaking: (speaker, isSpeaking) => {
      set(state => ({
        isTalkingMap: {
          ...state.isTalkingMap,
          [speaker]: isSpeaking
        }
      }));
    },
    
    classifyKeywords: () => {
      const { keyPhrases } = get();
      
      const positiveKeywords = [
        "satisfied", "great", "excellent", "happy", "interested", 
        "quality", "value", "recommend", "helpful", "support",
        "appreciate", "like", "love", "satisfaction", "impressive"
      ];
      
      const negativeKeywords = [
        "expensive", "problem", "issue", "disappointed", "delay", 
        "difficult", "complicated", "cancel", "refund", "complaint",
        "unhappy", "frustrated", "disconnect", "slow", "confusing"
      ];
      
      const categorizedKeywords: KeywordCategories = {
        positive: [],
        neutral: [], 
        negative: []
      };
      
      keyPhrases.forEach(phrase => {
        if (positiveKeywords.some(keyword => phrase.toLowerCase().includes(keyword))) {
          categorizedKeywords.positive.push(phrase);
        } else if (negativeKeywords.some(keyword => phrase.toLowerCase().includes(keyword))) {
          categorizedKeywords.negative.push(phrase);
        } else {
          categorizedKeywords.neutral.push(phrase);
        }
      });
      
      set({ keywordsByCategory: categorizedKeywords });
    },
    
    checkCoachingAlerts: () => {
      const { talkRatio, sentiment, keyPhrases, coachingAlerts } = get();
      const timestamp = Date.now();
      const newAlerts: CoachingAlert[] = [];
      
      if (talkRatio.agent > 70 && Math.random() > 0.5) {
        newAlerts.push({
          id: `talk-ratio-${timestamp}`,
          type: 'warning',
          message: '🗣️ The agent is talking too much. Let the customer speak more.',
          timestamp,
          dismissed: false
        });
      }
      
      if (sentiment.customer < 0.4 && Math.random() > 0.6) {
        newAlerts.push({
          id: `negative-sentiment-${timestamp}`,
          type: 'critical',
          message: '⚠️ Customer is showing negative sentiment. Address their concerns.',
          timestamp,
          dismissed: false
        });
      }
      
      const objectionKeywords = ['pricing', 'expensive', 'cost', 'price', 'discount', 'competitive'];
      if (keyPhrases.some(phrase => 
          objectionKeywords.some(keyword => phrase.toLowerCase().includes(keyword))
        ) && Math.random() > 0.7) {
        newAlerts.push({
          id: `objection-${timestamp}`,
          type: 'info',
          message: '💰 Customer has mentioned pricing. Focus on value proposition.',
          timestamp,
          dismissed: false
        });
      }
      
      if (newAlerts.length > 0) {
        set({
          coachingAlerts: [...coachingAlerts, ...newAlerts]
        });
      }
    },
    
    dismissAlert: (id) => {
      set(state => ({
        coachingAlerts: state.coachingAlerts.map(alert => 
          alert.id === id ? { ...alert, dismissed: true } : alert
        )
      }));
    },
    
    saveSentimentTrend: async () => {
      try {
        const { sentiment } = get();
        
        // Validate sentiment data before saving
        validateDataConsistency('saveSentimentTrend', {
          avgSentiment: (sentiment.agent + sentiment.customer) / 2
        });
        
        // Save sentiment trends to Supabase
        try {
          await Promise.all([
            supabase.from('sentiment_trends').insert({
              sentiment_label: sentiment.agent > 0.6 ? 'positive' : sentiment.agent < 0.4 ? 'negative' : 'neutral',
              confidence: sentiment.agent
            }),
            
            supabase.from('sentiment_trends').insert({
              sentiment_label: sentiment.customer > 0.6 ? 'positive' : sentiment.customer < 0.4 ? 'negative' : 'neutral',
              confidence: sentiment.customer
            })
          ]);
        } catch (error) {
          console.error('Error saving sentiment trend to Supabase:', error);
        }
      } catch (error) {
        console.error('Error saving sentiment trend:', error);
      }
    },
    
    savePastCall: async () => {
      const { callDuration, talkRatio, sentiment, keyPhrases } = get();
      
      await get().saveSentimentTrend();
      
      try {
        // Validate data before saving
        validateDataConsistency('savePastCall', {
          totalCalls: 1,
          avgSentiment: (sentiment.agent + sentiment.customer) / 2,
          avgTalkRatio: talkRatio
        });
        
        // Save to Supabase
        try {
          const { data, error } = await supabase
            .from('calls')
            .insert({
              duration: callDuration,
              talk_ratio_agent: talkRatio.agent,
              talk_ratio_customer: talkRatio.customer,
              sentiment_agent: sentiment.agent,
              sentiment_customer: sentiment.customer,
              key_phrases: keyPhrases
            })
            .select()
            .single();
          
          if (error) {
            console.error("Error saving to Supabase:", error);
          } else {
            console.log("Call saved to Supabase:", data);
          }
        } catch (supabaseError) {
          console.error("Error saving to Supabase:", supabaseError);
        }
        
        // Save keywords to keyword_trends table
        if (keyPhrases.length > 0) {
          const keywordPromises = keyPhrases.map(async (phrase) => {
            try {
              const { data: existingKeyword } = await supabase
                .from('keyword_trends')
                .select('*')
                .eq('keyword', phrase.toLowerCase())
                .maybeSingle();
                
              if (existingKeyword) {
                // Update existing keyword count
                await supabase
                  .from('keyword_trends')
                  .update({ 
                    count: (existingKeyword.count || 1) + 1,
                    last_used: new Date().toISOString()
                  })
                  .eq('id', existingKeyword.id);
              } else {
                // Insert new keyword
                await supabase
                  .from('keyword_trends')
                  .insert({
                    keyword: phrase.toLowerCase(),
                    count: 1,
                    category: get().keywordsByCategory.positive.includes(phrase) 
                      ? 'positive' 
                      : get().keywordsByCategory.negative.includes(phrase)
                        ? 'negative'
                        : 'neutral'
                  });
              }
            } catch (keywordError) {
              console.error(`Error saving keyword "${phrase}":`, keywordError);
            }
          });
          
          try {
            await Promise.all(keywordPromises);
            console.log("Keywords saved to trends");
          } catch (keywordError) {
            console.error("Error saving keywords:", keywordError);
          }
        }
      } catch (error) {
        console.error("Exception saving to Supabase:", error);
      }
      
      // Save to local call history
      const newHistoryItem: CallHistoryItem = {
        id: `call-${Date.now()}`,
        date: new Date().toISOString(),
        duration: callDuration,
        talkRatio: { ...talkRatio },
        sentiment: { ...sentiment },
        keyPhrases: [...keyPhrases]
      };
      
      set(state => ({
        callHistory: [newHistoryItem, ...state.callHistory]
      }));
    },
    
    loadPastCalls: async () => {
      try {
        // Fetch calls from Supabase
        try {
          const { data, error } = await supabase
            .from('calls')
            .select('*')
            .order('created_at', { ascending: false });
            
          if (error) {
            console.error("Error loading from Supabase:", error);
          } else {
            const formattedCalls: CallHistoryItem[] = data.map(call => ({
              id: call.id,
              date: call.created_at || new Date().toISOString(),
              duration: call.duration,
              talkRatio: {
                agent: call.talk_ratio_agent,
                customer: call.talk_ratio_customer
              },
              sentiment: {
                agent: call.sentiment_agent,
                customer: call.sentiment_customer
              },
              keyPhrases: call.key_phrases || []
            }));
            
            set({ callHistory: formattedCalls });
            console.log("Loaded calls from Supabase:", formattedCalls);
          }
        } catch (supabaseError) {
          console.error("Error loading from Supabase:", supabaseError);
          
          // Generate demo data if we have no data
          if (get().callHistory.length === 0) {
            const demoCalls: CallHistoryItem[] = Array.from({ length: 5 }).map((_, i) => ({
              id: `demo-call-${i}`,
              date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
              duration: Math.floor(Math.random() * 600) + 120,
              talkRatio: {
                agent: Math.floor(Math.random() * 30) + 40,
                customer: Math.floor(Math.random() * 30) + 40
              },
              sentiment: {
                agent: Math.random() * 0.5 + 0.5,
                customer: Math.random() * 0.5 + 0.3
              },
              keyPhrases: [
                "product features",
                "pricing options",
                "implementation timeline",
                "technical support"
              ]
            }));
            
            set({ callHistory: demoCalls });
            console.log("Using demo calls:", demoCalls);
          }
        }
      } catch (error) {
        console.error("Exception loading past calls:", error);
      }
    }
  };
});
