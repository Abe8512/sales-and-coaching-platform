
/**
 * Shared utility functions for consistent metric calculations across the application
 */

/**
 * Calculate talk ratio as a percentage
 * @param agentTalkTime Time agent spent talking (seconds)
 * @param customerTalkTime Time customer spent talking (seconds)
 * @returns Object with agent and customer talk percentages
 */
export const calculateTalkRatio = (agentTalkTime: number, customerTalkTime: number) => {
  const totalTime = agentTalkTime + customerTalkTime;
  if (totalTime === 0) return { agent: 50, customer: 50 };
  
  const agentRatio = (agentTalkTime / totalTime) * 100;
  
  return {
    agent: agentRatio,
    customer: 100 - agentRatio
  };
};

/**
 * Calculate conversion rate as a percentage
 * @param successfulCalls Number of successful calls
 * @param totalCalls Total number of calls
 * @returns Conversion rate percentage
 */
export const calculateConversionRate = (successfulCalls: number, totalCalls: number): number => {
  if (totalCalls === 0) return 0;
  return (successfulCalls / totalCalls) * 100;
};

/**
 * Calculate performance score based on multiple factors
 * @param params Object containing sentiment, talkRatio, and duration
 * @returns Performance score (0-100)
 */
export const calculatePerformanceScore = (params: {
  sentiment: { agent: number; customer: number };
  talkRatio: { agent: number; customer: number };
  duration: number;
}): number => {
  const { sentiment, talkRatio, duration } = params;
  
  // Base score from sentiment (0-100)
  const sentimentAvg = (sentiment.agent + sentiment.customer) / 2;
  const sentimentComponent = sentimentAvg * 100;
  
  // Talk ratio component (penalize if agent talks too much or too little)
  const idealAgentRatio = 50;
  const talkRatioDeviation = Math.abs(talkRatio.agent - idealAgentRatio);
  const talkRatioComponent = 100 - talkRatioDeviation;
  
  // Duration component (calls between 3-10 minutes are ideal)
  const durationMinutes = duration / 60;
  let durationComponent = 100;
  if (durationMinutes < 3) {
    durationComponent = durationMinutes * 33.3; // Scale up to 100 at 3 minutes
  } else if (durationMinutes > 10) {
    durationComponent = Math.max(0, 100 - ((durationMinutes - 10) * 10));
  }
  
  // Weighted average (sentiment 50%, talk ratio 30%, duration 20%)
  const score = (sentimentComponent * 0.5) + (talkRatioComponent * 0.3) + (durationComponent * 0.2);
  
  return Math.round(score);
};

/**
 * Validate data consistency across different data sources
 * @param metricName Name of the metric being validated
 * @param values Array of values for the same metric from different sources
 * @returns Boolean indicating if values are consistent
 */
export const validateMetricConsistency = (metricName: string, values: number[]): boolean => {
  if (values.length < 2) return true;
  
  // Calculate the average value
  const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
  
  // Check if any values deviate by more than 5%
  const threshold = 0.05; // 5% threshold
  const inconsistent = values.some(val => Math.abs(val - avg) / avg > threshold);
  
  if (inconsistent && process.env.NODE_ENV !== 'production') {
    console.warn(`Inconsistency detected in ${metricName}: ${values.join(', ')}`);
  }
  
  return !inconsistent;
};

/**
 * Calculate total calls from call transcripts data
 * @param transcripts Array of call transcript data
 * @returns Total number of calls
 */
export const calculateTotalCalls = (transcripts: any[]): number => {
  return transcripts ? transcripts.length : 0;
};

/**
 * Calculate average sentiment from call transcripts data
 * @param transcripts Array of call transcript data 
 * @returns Average sentiment score (0-1)
 */
export const calculateAvgSentiment = (transcripts: any[]): number => {
  if (!transcripts || transcripts.length === 0) return 0;
  
  const sentimentSum = transcripts.reduce((sum, call) => {
    if (call.sentiment === 'positive') return sum + 0.9;
    if (call.sentiment === 'negative') return sum + 0.3;
    if (call.sentiment === 'neutral') return sum + 0.6;
    if (typeof call.sentiment === 'number') return sum + call.sentiment;
    return sum + 0.5; // Default value if sentiment is undefined
  }, 0);
  
  return sentimentSum / transcripts.length;
};

/**
 * Calculate outcomes distribution from call transcripts
 * @param transcripts Array of call transcript data
 * @returns Object with counts and percentages for each outcome
 */
export const calculateOutcomeDistribution = (transcripts: any[]): {
  outcome: string;
  count: number;
  percentage: number;
}[] => {
  if (!transcripts || transcripts.length === 0) return [];
  
  const outcomes: Record<string, number> = {};
  
  transcripts.forEach(call => {
    const outcome = call.outcome || 
                   (call.sentiment === 'positive' ? 'Qualified Lead' : 
                    call.sentiment === 'negative' ? 'No Interest' : 'Follow-up Required');
    
    if (!outcomes[outcome]) {
      outcomes[outcome] = 0;
    }
    outcomes[outcome]++;
  });
  
  return Object.entries(outcomes).map(([outcome, count]) => ({
    outcome,
    count,
    percentage: Math.round((count / transcripts.length) * 100)
  }));
};

export default {
  calculateTalkRatio,
  calculateConversionRate,
  calculatePerformanceScore,
  validateMetricConsistency,
  calculateTotalCalls,
  calculateAvgSentiment,
  calculateOutcomeDistribution
};
