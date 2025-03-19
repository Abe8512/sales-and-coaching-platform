
export interface SentimentData {
  score: number;
  label: 'positive' | 'negative' | 'neutral';
  confidence: number;
  time?: string;
}

export interface KeyPhraseData {
  text: string;
  category?: 'positive' | 'negative' | 'neutral';
  score?: number;
}

export interface CallMetrics {
  duration: number;
  agentTalkTime: number;
  customerTalkTime: number;
  agentInterruptions: number;
  customerInterruptions: number;
  talkRatio: {
    agent: number;
    customer: number;
  };
  sentiment: {
    agent: number;
    customer: number;
  };
}
