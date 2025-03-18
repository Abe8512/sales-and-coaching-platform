
import { create } from 'zustand';
import { io } from 'socket.io-client';

interface CallMetricsState {
  isRecording: boolean;
  callDuration: number;
  talkRatio: { agent: number; customer: number };
  sentiment: { agent: number; customer: number };
  isTalkingMap: { agent: boolean; customer: boolean };
  keyPhrases: string[];
  socketConnected: boolean;
  recordingStartTime: number | null;
  
  // Actions
  startRecording: () => void;
  stopRecording: () => void;
  updateMetrics: (data: Partial<CallMetricsState>) => void;
  updateKeyPhrases: (phrase: string) => void;
  toggleSpeaking: (speaker: 'agent' | 'customer', isSpeaking: boolean) => void;
}

// For demo purposes, we'll simulate a WebSocket connection with timer updates
export const useCallMetricsStore = create<CallMetricsState>((set, get) => {
  let durationTimer: NodeJS.Timeout | null = null;
  let speakingSimulationTimer: NodeJS.Timeout | null = null;
  
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
    
    startRecording: () => {
      const startTime = Date.now();
      set({ 
        isRecording: true, 
        callDuration: 0,
        recordingStartTime: startTime,
        keyPhrases: []
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
        }
      }, 2000);
    },
    
    stopRecording: () => {
      if (durationTimer) clearInterval(durationTimer);
      if (speakingSimulationTimer) clearInterval(speakingSimulationTimer);
      
      set({ 
        isRecording: false,
        isTalkingMap: { agent: false, customer: false },
        recordingStartTime: null
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
    }
  };
});
