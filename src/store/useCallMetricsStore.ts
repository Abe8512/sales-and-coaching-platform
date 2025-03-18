
import { create } from 'zustand';
import { supabase } from "@/integrations/supabase/client";

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

// For demo purposes, we'll simulate a WebSocket connection with timer updates
export const useCallMetricsStore = create<CallMetricsState>((set, get) => {
  let durationTimer: NodeJS.Timeout | null = null;
  let speakingSimulationTimer: NodeJS.Timeout | null = null;
  let alertCheckTimer: NodeJS.Timeout | null = null;
  
  // Mock socket connection for demonstration
  // In a real implementation, you would connect to your WebSocket server
  const initializeSocketConnection = () => {
    // We're just simulating connection status
    set({ socketConnected: true });
    
    // Here you would typically:
    // const socket = io("ws://your-server.com/ws");
    // socket.on("connect", () => set({ socketConnected: true }));
    // socket.on("disconnect", () => set({ socketConnected: false }));
    // socket.on("message", (data) => set({ ... }));
    
    return () => {
      // Clean up socket when the app unmounts
      if (durationTimer) clearInterval(durationTimer);
      if (speakingSimulationTimer) clearInterval(speakingSimulationTimer);
      if (alertCheckTimer) clearInterval(alertCheckTimer);
      // socket.disconnect();
    };
  };
  
  // Initialize socket connection
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
      
      // Duration update timer
      durationTimer = setInterval(() => {
        const { recordingStartTime } = get();
        if (recordingStartTime) {
          const duration = Math.floor((Date.now() - recordingStartTime) / 1000);
          set({ callDuration: duration });
        }
      }, 1000);
      
      // Simulate speakers talking
      speakingSimulationTimer = setInterval(() => {
        // Randomly toggle who is speaking
        if (Math.random() > 0.7) {
          const agentSpeaking = Math.random() > 0.5;
          const customerSpeaking = Math.random() > 0.5;
          
          set({ 
            isTalkingMap: { 
              agent: agentSpeaking, 
              customer: customerSpeaking 
            }
          });
          
          // Update talk ratio over time
          set(state => {
            // Generate small random changes to talk ratio
            const agentShift = Math.random() * 2 - 1;
            return {
              talkRatio: {
                agent: Math.max(20, Math.min(80, state.talkRatio.agent + agentShift)),
                customer: Math.max(20, Math.min(80, state.talkRatio.customer - agentShift))
              },
              // Also slightly adjust sentiment
              sentiment: {
                agent: Math.max(0, Math.min(1, state.sentiment.agent + (Math.random() * 0.1 - 0.05))),
                customer: Math.max(0, Math.min(1, state.sentiment.customer + (Math.random() * 0.1 - 0.05)))
              }
            };
          });
          
          // Occasionally add a key phrase
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
            get().classifyKeywords(); // Classify the new keywords
          }
        }
      }, 2000);
      
      // Start checking for coaching alerts
      alertCheckTimer = setInterval(() => {
        get().checkCoachingAlerts();
      }, 5000);
    },
    
    stopRecording: () => {
      if (durationTimer) clearInterval(durationTimer);
      if (speakingSimulationTimer) clearInterval(speakingSimulationTimer);
      if (alertCheckTimer) clearInterval(alertCheckTimer);
      
      // Save call data before resetting
      if (get().isRecording) {
        get().savePastCall();
      }
      
      set({ 
        isRecording: false,
        isTalkingMap: { agent: false, customer: false },
        recordingStartTime: null,
        coachingAlerts: []
      });
    },
    
    updateMetrics: (data) => {
      set({ ...data });
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
      
      // Define the keyword classification rules
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
      
      // Classify the key phrases
      const categorizedKeywords: KeywordCategories = {
        positive: [],
        neutral: [], 
        negative: []
      };
      
      keyPhrases.forEach(phrase => {
        // Check if the phrase contains any positive keywords
        if (positiveKeywords.some(keyword => phrase.toLowerCase().includes(keyword))) {
          categorizedKeywords.positive.push(phrase);
        }
        // Check if the phrase contains any negative keywords
        else if (negativeKeywords.some(keyword => phrase.toLowerCase().includes(keyword))) {
          categorizedKeywords.negative.push(phrase);
        }
        // If it doesn't match either, it's neutral
        else {
          categorizedKeywords.neutral.push(phrase);
        }
      });
      
      set({ keywordsByCategory: categorizedKeywords });
    },
    
    checkCoachingAlerts: () => {
      const { talkRatio, sentiment, keyPhrases, coachingAlerts } = get();
      const timestamp = Date.now();
      const newAlerts: CoachingAlert[] = [];
      
      // Check for talk ratio imbalance
      if (talkRatio.agent > 70 && Math.random() > 0.5) {
        newAlerts.push({
          id: `talk-ratio-${timestamp}`,
          type: 'warning',
          message: '🗣️ The agent is talking too much. Let the customer speak more.',
          timestamp,
          dismissed: false
        });
      }
      
      // Check for negative customer sentiment
      if (sentiment.customer < 0.4 && Math.random() > 0.6) {
        newAlerts.push({
          id: `negative-sentiment-${timestamp}`,
          type: 'critical',
          message: '⚠️ Customer is showing negative sentiment. Address their concerns.',
          timestamp,
          dismissed: false
        });
      }
      
      // Check for potential objections in key phrases
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
      
      // Only add alerts if we have new ones
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
    
    savePastCall: async () => {
      // Create a new call history item based on current metrics
      const { callDuration, talkRatio, sentiment, keyPhrases } = get();
      
      // Save to Supabase
      try {
        const { data, error } = await supabase
          .from('calls')
          .insert([
            { 
              duration: callDuration,
              talk_ratio_agent: talkRatio.agent,
              talk_ratio_customer: talkRatio.customer,
              sentiment_agent: sentiment.agent,
              sentiment_customer: sentiment.customer,
              key_phrases: keyPhrases
            }
          ])
          .select()
          .single();
        
        if (error) {
          console.error("Error saving to Supabase:", error);
        } else {
          console.log("Call saved to Supabase:", data);
        }
      } catch (error) {
        console.error("Exception saving to Supabase:", error);
      }
      
      // For immediate UI update, also add to local state
      const newHistoryItem: CallHistoryItem = {
        id: `call-${Date.now()}`,
        date: new Date().toISOString(),
        duration: callDuration,
        talkRatio: { ...talkRatio },
        sentiment: { ...sentiment },
        keyPhrases: [...keyPhrases]
      };
      
      // Add to history
      set(state => ({
        callHistory: [newHistoryItem, ...state.callHistory]
      }));
    },
    
    loadPastCalls: async () => {
      try {
        const { data, error } = await supabase
          .from('calls')
          .select('*')
          .order('created_at', { ascending: false });
          
        if (error) {
          console.error("Error loading from Supabase:", error);
          return;
        }
        
        // Transform Supabase data to our format
        const formattedCalls: CallHistoryItem[] = data.map(call => ({
          id: call.id,
          date: call.created_at,
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
      } catch (error) {
        console.error("Exception loading from Supabase:", error);
      }
    }
  };
});
