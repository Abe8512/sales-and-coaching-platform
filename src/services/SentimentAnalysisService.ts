import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Types for sentiment analysis results
export interface SentimentAnalysisResult {
  overall: string; // positive, negative, neutral
  segments: SentimentSegment[];
  confidence_issues: ConfidenceIssue[];
  missed_opportunities: MissedOpportunity[];
  filler_words: FillerWordAnalysis;
  summary: string;
}

export interface SentimentSegment {
  text: string;
  sentiment: string; // positive, negative, neutral
  start_time: number;
  end_time: number;
  speaker: string;
}

export interface ConfidenceIssue {
  text: string;
  issue_type: string; // uncertainty, hesitation, etc.
  time: number;
  suggestion: string;
}

export interface MissedOpportunity {
  text: string;
  opportunity_type: string; // upsell, objection_handling, etc.
  time: number;
  suggestion: string;
}

export interface FillerWordAnalysis {
  total_count: number;
  by_word: {[key: string]: number};
  frequency_per_minute: number;
}

// Filler words to detect
const FILLER_WORDS = ["um", "uh", "like", "actually", "you know", "so", "kind of", "sort of", "basically"];

/**
 * Analyze a transcript for sentiment, confidence issues, and missed opportunities
 */
export const analyzeSentiment = async (
  transcriptText: string, 
  repName?: string, 
  customerName?: string,
  duration?: number
): Promise<SentimentAnalysisResult> => {
  try {
    // For now, we'll implement a simple rule-based sentiment analysis
    // In a real app, this would call a service like OpenAI's API
    
    // Count positive and negative words
    const positiveWords = ['happy', 'great', 'excellent', 'perfect', 'good', 'love', 'best', 'amazing', 'interested', 'yes', 'agreed'];
    const negativeWords = ['bad', 'poor', 'terrible', 'awful', 'hate', 'dislike', 'no', 'not', 'never', 'problem', 'issue', 'sorry', 'unfortunate'];
    
    const words = transcriptText.toLowerCase().split(/\s+/);
    
    let positiveCount = 0;
    let negativeCount = 0;
    
    words.forEach(word => {
      if (positiveWords.includes(word)) positiveCount++;
      if (negativeWords.includes(word)) negativeCount++;
    });
    
    // Overall sentiment determination
    let overallSentiment = 'neutral';
    if (positiveCount > negativeCount * 1.5) {
      overallSentiment = 'positive';
    } else if (negativeCount > positiveCount) {
      overallSentiment = 'negative';
    }
    
    // Analyze filler words
    const fillerWordAnalysis = analyzeFillerWords(transcriptText, duration || 120);
    
    // Detect confidence issues
    const confidenceIssues = detectConfidenceIssues(transcriptText);
    
    // Detect missed opportunities
    const missedOpportunities = detectMissedOpportunities(transcriptText, repName, customerName);
    
    // Create segments (would be done better with an actual service)
    const segments: SentimentSegment[] = [];
    const sentences = transcriptText.split(/[.!?]+/).filter(s => s.trim().length > 0);
    
    let currentTime = 0;
    const avgWordsPerSecond = (transcriptText.split(/\s+/).length) / (duration || 120);
    
    sentences.forEach((sentence, index) => {
      const wordCount = sentence.split(/\s+/).length;
      const sentenceDuration = wordCount / avgWordsPerSecond;
      const startTime = currentTime;
      const endTime = currentTime + sentenceDuration;
      
      // Determine segment speaker (simplistic alternating approach)
      const speaker = index % 2 === 0 ? repName || 'Sales Rep' : customerName || 'Customer';
      
      // Determine sentence sentiment
      let sentiment = 'neutral';
      const sentenceWords = sentence.toLowerCase().split(/\s+/);
      
      let sentencePositiveCount = 0;
      let sentenceNegativeCount = 0;
      
      sentenceWords.forEach(word => {
        if (positiveWords.includes(word)) sentencePositiveCount++;
        if (negativeWords.includes(word)) sentenceNegativeCount++;
      });
      
      if (sentencePositiveCount > sentenceNegativeCount) {
        sentiment = 'positive';
      } else if (sentenceNegativeCount > sentencePositiveCount) {
        sentiment = 'negative';
      }
      
      segments.push({
        text: sentence.trim(),
        sentiment,
        start_time: startTime,
        end_time: endTime,
        speaker
      });
      
      currentTime = endTime;
    });
    
    // Generate a summary
    const summary = generateSummary(
      overallSentiment, 
      fillerWordAnalysis, 
      confidenceIssues, 
      missedOpportunities,
      repName,
      customerName
    );
    
    // Return the complete analysis
    return {
      overall: overallSentiment,
      segments,
      confidence_issues: confidenceIssues,
      missed_opportunities: missedOpportunities,
      filler_words: fillerWordAnalysis,
      summary
    };
  } catch (error) {
    console.error('Error analyzing sentiment:', error);
    toast.error('Failed to analyze sentiment');
    
    // Return default values in case of error
    return {
      overall: 'neutral',
      segments: [],
      confidence_issues: [],
      missed_opportunities: [],
      filler_words: {
        total_count: 0,
        by_word: {},
        frequency_per_minute: 0
      },
      summary: 'Failed to analyze sentiment'
    };
  }
};

/**
 * Analyze filler words in the transcript
 */
const analyzeFillerWords = (text: string, durationSeconds: number): FillerWordAnalysis => {
  const lowerText = text.toLowerCase();
  const words = lowerText.split(/\s+/);
  
  let totalCount = 0;
  const byWord: {[key: string]: number} = {};
  
  FILLER_WORDS.forEach(fillerWord => {
    const regex = new RegExp(`\\b${fillerWord}\\b`, 'gi');
    const matches = lowerText.match(regex);
    const count = matches ? matches.length : 0;
    
    if (count > 0) {
      byWord[fillerWord] = count;
      totalCount += count;
    }
  });
  
  // Calculate frequency per minute
  const durationMinutes = durationSeconds / 60;
  const frequencyPerMinute = durationMinutes > 0 ? totalCount / durationMinutes : 0;
  
  return {
    total_count: totalCount,
    by_word: byWord,
    frequency_per_minute: Math.round(frequencyPerMinute * 10) / 10 // Round to 1 decimal place
  };
};

/**
 * Detect confidence issues in the transcript
 */
const detectConfidenceIssues = (text: string): ConfidenceIssue[] => {
  const issues: ConfidenceIssue[] = [];
  
  // Look for hesitation patterns
  const hesitationPatterns = [
    { regex: /I'm not (really )?sure/gi, type: 'uncertainty' },
    { regex: /I think/gi, type: 'uncertainty' },
    { regex: /maybe|perhaps/gi, type: 'uncertainty' },
    { regex: /I don't know/gi, type: 'uncertainty' },
    { regex: /um{2,}|uh{2,}/gi, type: 'hesitation' },
    { regex: /let me (just )?check/gi, type: 'uncertainty' }
  ];
  
  // Simple sentence splitter
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  
  sentences.forEach((sentence, index) => {
    hesitationPatterns.forEach(pattern => {
      if (pattern.regex.test(sentence)) {
        issues.push({
          text: sentence.trim(),
          issue_type: pattern.type,
          time: index * 10, // Very rough estimate of time
          suggestion: getSuggestionForConfidenceIssue(pattern.type, sentence)
        });
      }
    });
  });
  
  return issues;
};

/**
 * Get suggestions for confidence issues
 */
const getSuggestionForConfidenceIssue = (type: string, text: string): string => {
  if (type === 'uncertainty') {
    return "Replace uncertain language with confident statements. For example, instead of 'I think' say 'I know' or 'I'm confident that'.";
  } else if (type === 'hesitation') {
    return "Reduce filler words and practice a smoother delivery with prepared talking points.";
  }
  
  return "Work on building confidence in your sales presentation.";
};

/**
 * Detect missed sales opportunities in the transcript
 */
const detectMissedOpportunities = (
  text: string, 
  repName?: string, 
  customerName?: string
): MissedOpportunity[] => {
  const opportunities: MissedOpportunity[] = [];
  
  // Look for missed opportunity patterns
  const opportunityPatterns = [
    { 
      regex: /how much (is|does) it cost|price/gi, 
      type: 'value_proposition',
      suggestion: "When customers ask about price, always emphasize value before discussing cost."
    },
    { 
      regex: /(competitor|other option|alternative)/gi, 
      type: 'competitive_positioning',
      suggestion: "When competitors are mentioned, highlight your unique advantages rather than criticizing alternatives."
    },
    { 
      regex: /not sure|need to think/gi, 
      type: 'objection_handling',
      suggestion: "Address hesitation directly by asking what specific concerns they have."
    },
    { 
      regex: /interest(ed)? in (just|only)/gi, 
      type: 'upsell',
      suggestion: "When customers express interest in just one product, consider introducing complementary offerings."
    }
  ];
  
  // Simple sentence splitter
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  
  sentences.forEach((sentence, index) => {
    opportunityPatterns.forEach(pattern => {
      if (pattern.regex.test(sentence)) {
        // Personalize the suggestion if we have names
        let suggestion = pattern.suggestion;
        if (repName && customerName) {
          suggestion = suggestion.replace(/customers/g, customerName);
          suggestion = suggestion.replace(/your/g, `${repName}'s`);
        }
        
        opportunities.push({
          text: sentence.trim(),
          opportunity_type: pattern.type,
          time: index * 10, // Very rough estimate of time
          suggestion
        });
      }
    });
  });
  
  return opportunities;
};

/**
 * Generate a summary of the analysis
 */
const generateSummary = (
  sentiment: string,
  fillerWords: FillerWordAnalysis,
  confidenceIssues: ConfidenceIssue[],
  missedOpportunities: MissedOpportunity[],
  repName?: string,
  customerName?: string
): string => {
  let summary = '';
  
  const rep = repName || 'The sales rep';
  const customer = customerName || 'The customer';
  
  // Sentiment summary
  if (sentiment === 'positive') {
    summary += `${rep} maintained a positive tone throughout the call. ${customer} appeared receptive to the conversation. `;
  } else if (sentiment === 'negative') {
    summary += `The call had a generally negative tone. ${rep} should work on creating a more positive atmosphere. `;
  } else {
    summary += `The call maintained a neutral tone. ${rep} could work on bringing more enthusiasm to increase engagement. `;
  }
  
  // Filler words summary
  if (fillerWords.total_count > 10) {
    summary += `${rep} used filler words frequently (${fillerWords.frequency_per_minute.toFixed(1)} per minute), which may impact perceived confidence. `;
    
    // Add detail about the most common filler word
    let mostCommon = '';
    let maxCount = 0;
    
    Object.entries(fillerWords.by_word).forEach(([word, count]) => {
      if (count > maxCount) {
        mostCommon = word;
        maxCount = count;
      }
    });
    
    if (mostCommon) {
      summary += `The most common filler word was "${mostCommon}" (${maxCount} times). `;
    }
  } else if (fillerWords.total_count > 0) {
    summary += `${rep} used some filler words, but not excessively. `;
  } else {
    summary += `${rep} spoke clearly with minimal filler words. `;
  }
  
  // Confidence issues summary
  if (confidenceIssues.length > 3) {
    summary += `There were ${confidenceIssues.length} instances where ${rep} displayed uncertainty or hesitation. `;
  } else if (confidenceIssues.length > 0) {
    summary += `${rep} showed a few moments of uncertainty. `;
  } else {
    summary += `${rep} displayed good confidence throughout the call. `;
  }
  
  // Missed opportunities summary
  if (missedOpportunities.length > 0) {
    summary += `There were ${missedOpportunities.length} missed opportunities to strengthen the sale. `;
    
    // Add a specific example
    if (missedOpportunities.length > 0) {
      const example = missedOpportunities[0];
      summary += `For example, ${rep} could have ${example.suggestion.toLowerCase()}. `;
    }
  } else {
    summary += `${rep} did well at identifying and addressing sales opportunities. `;
  }
  
  return summary;
};

/**
 * Save sentiment analysis results to Supabase
 */
export const saveSentimentAnalysis = async (
  callId: string, 
  analysis: SentimentAnalysisResult
): Promise<void> => {
  try {
    // Store the basic sentiment info in the calls table
    const sentimentValue = analysis.overall === 'positive' ? 0.8 : 
                          analysis.overall === 'negative' ? 0.3 : 0.5;
    
    // For now, only update the existing calls table with the sentiment values
    // and a summary. Additional tables would require schema changes.
    const { error: updateError } = await supabase
      .from('calls')
      .update({
        sentiment_agent: sentimentValue,
        sentiment_customer: sentimentValue,
        // Include the summary in an existing text field
        transcription_notes: analysis.summary || "Sentiment analysis completed",
        // Add filler word count as metadata if there's a JSON field
        metadata: JSON.stringify({
          filler_words_count: analysis.filler_words.total_count,
          filler_words_frequency: analysis.filler_words.frequency_per_minute,
          confidence_issues_count: analysis.confidence_issues.length,
          missed_opportunities_count: analysis.missed_opportunities.length
        })
      })
      .eq('id', callId);
    
    if (updateError) {
      console.error('Error updating call with sentiment analysis:', updateError);
      return;
    }
    
    // Notify that analysis is complete
    toast.success('Sentiment analysis completed');
    
    // Dispatch event to notify other components
    window.dispatchEvent(new CustomEvent('sentiment-analysis-updated', { 
      detail: { callId }
    }));
    
  } catch (error) {
    console.error('Error saving sentiment analysis:', error);
    toast.error('Failed to save sentiment analysis');
  }
};

/**
 * Hook for using sentiment analysis service
 */
export const useSentimentAnalysis = () => {
  const analyzeCallSentiment = async (
    transcriptText: string, 
    repName?: string, 
    customerName?: string,
    callId?: string,
    duration?: number
  ) => {
    // Perform sentiment analysis
    const analysis = await analyzeSentiment(transcriptText, repName, customerName, duration);
    
    // If we have a callId, save the analysis
    if (callId) {
      await saveSentimentAnalysis(callId, analysis);
    }
    
    return analysis;
  };
  
  return { analyzeCallSentiment };
}; 