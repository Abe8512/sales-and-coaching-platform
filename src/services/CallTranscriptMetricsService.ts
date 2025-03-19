
import { CallTranscript } from './CallTranscriptService';

interface MetricsResult {
  outcomeStats: {
    qualified: number;
    followUp: number;
    noInterest: number;
    total: number;
  };
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

  return {
    outcomeStats: {
      qualified,
      followUp,
      noInterest,
      total
    },
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
  
  // Convert to array for chart
  return Object.entries(dates).map(([date, count]) => ({
    date,
    count
  }));
};
