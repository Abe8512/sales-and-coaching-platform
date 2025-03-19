
// Call metrics state interface
export interface CallMetricsState {
  startTime: Date | null;
  endTime: Date | null;
  duration: number;
  agentTalkTime: number;
  customerTalkTime: number;
  agentInterruptions: number;
  customerInterruptions: number;
  keyPhrases: { text: string; category?: string }[];
  sentiment: { agent: number; customer: number };
  sentimentTrend: {
    time: string;
    agent: number;
    customer: number;
  }[];
  transcript: string;
  recordingUrl: string;
  recordingId: string | null;
  isRecording: boolean;
  isCallEnded: boolean;
  callScore: number;
  outcome: string;
  summary: string;
  nextSteps: string;
  feedback: string;
  date: string;
  talkRatio: { agent: number; customer: number };
  callHistory: any[];
  isLoading: boolean;
  error: string | null;
  keywordsByCategory?: {
    positive: string[];
    neutral: string[];
    negative: string[];
  };
  
  // Functions
  startRecording: () => void;
  stopRecording: () => Promise<void>;
  resetCallState: () => void;
  updateCallMetrics: (metrics: Partial<CallMetricsState>) => void;
  saveSentimentTrend: () => void;
  setRecordingUrl: (url: string) => void;
  setRecordingId: (id: string) => void;
  saveCallMetrics: () => Promise<void>;
  loadPastCalls: () => Promise<void>;
  classifyKeywords: () => void;
}
