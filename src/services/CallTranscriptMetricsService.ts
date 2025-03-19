
import { CallTranscript } from './CallTranscriptService';

export interface CallOutcome {
  outcome: string;
  count: number;
  percentage: number;
}

export interface MetricsResult {
  outcomeStats: CallOutcome[];
  sentimentBreakdown: {
    positive: number;
    neutral: number;
    negative: number;
  };
  averageCallScore: number;
}

export const getMetrics = (transcripts: CallTranscript[]): MetricsResult => {
  const total = transcripts.length;
  let qualified = 0;
  let followUp = 0;
  let noInterest = 0;
  let positive = 0;
  let neutral = 0;
  let negative = 0;
  let totalScore = 0;

  for (const transcript of transcripts) {
    // Calculate outcome stats
    const sentiment = transcript.sentiment || 'neutral';
    
    if (sentiment === 'positive') {
      qualified++;
      positive++;
    } else if (sentiment === 'negative') {
      noInterest++;
      negative++;
    } else {
      followUp++;
      neutral++;
    }

    // Sum call scores
    if (transcript.call_score) {
      totalScore += transcript.call_score;
    }
  }

  // Convert to array of CallOutcome objects
  const outcomeStats: CallOutcome[] = [
    {
      outcome: 'Qualified Leads',
      count: qualified,
      percentage: total > 0 ? Math.round((qualified / total) * 100) : 0
    },
    {
      outcome: 'Follow Up Required',
      count: followUp,
      percentage: total > 0 ? Math.round((followUp / total) * 100) : 0
    },
    {
      outcome: 'No Interest',
      count: noInterest,
      percentage: total > 0 ? Math.round((noInterest / total) * 100) : 0
    },
    {
      outcome: 'Total',
      count: total,
      percentage: 100
    }
  ];

  return {
    outcomeStats,
    sentimentBreakdown: {
      positive,
      neutral,
      negative
    },
    averageCallScore: total > 0 ? totalScore / total : 0
  };
};

export const getCallDistributionData = (transcripts: CallTranscript[]) => {
  const now = new Date();
  const dates: { [key: string]: number } = {};
  
  // Initialize last 7 days
  for (let i = 6; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(now.getDate() - i);
    dates[date.toISOString().slice(0, 10)] = 0;
  }
  
  // Count calls per day
  for (const transcript of transcripts) {
    if (transcript.created_at) {
      const date = transcript.created_at.slice(0, 10);
      if (dates[date] !== undefined) {
        dates[date]++;
      }
    }
  }
  
  // Convert to array for chart with correct property names
  return Object.entries(dates).map(([date, count]) => ({
    name: date,
    calls: count
  }));
};
