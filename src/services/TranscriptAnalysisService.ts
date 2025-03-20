// A service for analyzing transcript text and extracting insights
export class TranscriptAnalysisService {
  private cachedSentiments = new Map<string, string>();
  private cachedKeywords = new Map<string, string[]>();
  private cachedScores = new Map<string, number>();
  private cachedMetrics = new Map<string, any>();
  
  // Common sales objections for detection
  private objectionPhrases = [
    'too expensive', 'can\'t afford', 'not in budget', 'price is too high',
    'need to think about it', 'not ready', 'need more time', 
    'need to talk to', 'get approval', 'check with',
    'competitor', 'other option', 'alternative',
    'not interested', 'don\'t need', 'don\'t see the value',
    'won\'t work for us', 'too complicated'
  ];
  
  // Filler words to detect
  private fillerWords = [
    'um', 'uh', 'like', 'actually', 'you know', 'so', 
    'kind of', 'sort of', 'basically', 'right', 'okay', 'just'
  ];
  
  // Analyze text and generate a sentiment score
  public analyzeSentiment(text: string): 'positive' | 'neutral' | 'negative' {
    // Check cache first to avoid recalculating for the same text
    if (this.cachedSentiments.has(text)) {
      return this.cachedSentiments.get(text) as 'positive' | 'neutral' | 'negative';
    }
    
    const positiveWords = ['great', 'good', 'excellent', 'happy', 'pleased', 'thank', 'appreciate', 'yes', 'perfect', 'love'];
    const negativeWords = ['bad', 'terrible', 'unhappy', 'disappointed', 'issue', 'problem', 'no', 'not', 'cannot', 'wrong'];
    
    const lowerText = text.toLowerCase();
    let positiveScore = 0;
    let negativeScore = 0;
    
    positiveWords.forEach(word => {
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      const matches = lowerText.match(regex);
      if (matches) positiveScore += matches.length;
    });
    
    negativeWords.forEach(word => {
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      const matches = lowerText.match(regex);
      if (matches) negativeScore += matches.length;
    });
    
    let result: 'positive' | 'neutral' | 'negative';
    if (positiveScore > negativeScore * 1.5) result = 'positive';
    else if (negativeScore > positiveScore * 1.5) result = 'negative';
    else result = 'neutral';
    
    // Cache the result
    this.cachedSentiments.set(text, result);
    return result;
  }
  
  // Extract keywords from text
  public extractKeywords(text: string): string[] {
    // Check cache first to avoid recalculating
    if (this.cachedKeywords.has(text)) {
      return this.cachedKeywords.get(text) || [];
    }
    
    const stopWords = ['a', 'an', 'the', 'and', 'or', 'but', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'in', 'on', 'at', 'to', 'for', 'with', 'by', 'about', 'of', 'that', 'this', 'these', 'those'];
    const words = text.toLowerCase().match(/\b(\w+)\b/g) || [];
    const wordFrequency: Record<string, number> = {};
    
    words.forEach(word => {
      if (!stopWords.includes(word) && word.length > 2) {
        wordFrequency[word] = (wordFrequency[word] || 0) + 1;
      }
    });
    
    const result = Object.entries(wordFrequency)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(entry => entry[0]);
      
    // Cache the result
    this.cachedKeywords.set(text, result);
    return result;
  }
  
  // Generate a call score
  public generateCallScore(text: string, sentiment: string): number {
    // Use caching to avoid recalculating
    const cacheKey = `${text}-${sentiment}`;
    if (this.cachedScores.has(cacheKey)) {
      return this.cachedScores.get(cacheKey) || 70;
    }
    
    // Base score
    let score = 70;
    
    if (sentiment === 'positive') score += 15;
    if (sentiment === 'negative') score -= 10;
    
    // Check for customer service phrases
    const goodPhrases = [
      'how can i help', 
      'thank you', 
      'appreciate', 
      'understand', 
      'let me explain',
      'would you like'
    ];
    
    goodPhrases.forEach(phrase => {
      if (text.toLowerCase().includes(phrase)) score += 2;
    });
    
    // Add subtle randomness (within 3 points) to avoid jitter on recalculations
    score += Math.floor(Math.random() * 6) - 3;
    
    // Ensure score is between 0-100
    const finalScore = Math.max(0, Math.min(100, score));
    
    // Cache the result
    this.cachedScores.set(cacheKey, finalScore);
    return finalScore;
  }
  
  // Split transcript into segments by speaker
  public splitBySpeaker(text: string, segments: any[] = [], numberOfSpeakers: number = 2): any[] {
    if (!segments || segments.length === 0) {
      // If no segments, create a single segment with the full text
      return [{
        id: 1,
        start: 0,
        end: 30, // Arbitrary end time if not known
        text: text,
        speaker: "Agent", // Default to Agent
        confidence: 0.9
      }];
    }
    
    // Simple algorithm to alternate speakers
    return segments.map((segment, index) => {
      // Simple alternating pattern for agent/customer
      const speakerIndex = index % numberOfSpeakers;
      const speaker = speakerIndex === 0 ? "Agent" : "Customer";
      
      return {
        id: segment.id,
        start: segment.start,
        end: segment.end,
        text: segment.text,
        speaker,
        confidence: segment.confidence
      };
    });
  }
  
  // Calculate comprehensive call metrics
  public calculateCallMetrics(text: string, segments: any[], duration: number) {
    // Check cache first for this specific combination
    const cacheKey = `metrics-${text.substring(0, 100)}-${duration}`;
    if (this.cachedMetrics.has(cacheKey)) {
      return this.cachedMetrics.get(cacheKey);
    }
    
    // Ensure we have segments with speaker information
    const processedSegments = this.ensureSegments(text, segments, 2);
    
    // Calculate talk time for each speaker
    let agentTalkTime = 0;
    let customerTalkTime = 0;
    let totalWords = 0;
    let agentWords = 0;
    let customerWords = 0;
    
    processedSegments.forEach(segment => {
      const segmentDuration = segment.end - segment.start;
      const words = segment.text.split(/\s+/).filter((w: string) => w.length > 0);
      totalWords += words.length;
      
      if (segment.speaker === "Agent") {
        agentTalkTime += segmentDuration;
        agentWords += words.length;
      } else {
        customerTalkTime += segmentDuration;
        customerWords += words.length;
      }
    });
    
    // If duration wasn't provided or calculated properly, estimate it
    const calculatedDuration = agentTalkTime + customerTalkTime;
    const finalDuration = duration > 0 ? duration : calculatedDuration > 0 ? calculatedDuration : 60;
    
    // Calculate talk ratio
    const totalTalkTime = agentTalkTime + customerTalkTime;
    const talkRatio = {
      agent: totalTalkTime > 0 ? (agentTalkTime / totalTalkTime) * 100 : 50,
      customer: totalTalkTime > 0 ? (customerTalkTime / totalTalkTime) * 100 : 50
    };
    
    // Calculate speaking speed (words per minute)
    const speakingSpeed = {
      overall: (totalWords / finalDuration) * 60,
      agent: (agentWords / Math.max(agentTalkTime, 1)) * 60,
      customer: (customerWords / Math.max(customerTalkTime, 1)) * 60
    };
    
    // Detect filler words
    const fillerWordCounts = this.detectFillerWords(text);
    const totalFillerWords = Object.values(fillerWordCounts).reduce((sum, count) => sum + count, 0);
    const fillerWordsPerMinute = (totalFillerWords / (finalDuration / 60));
    
    // Detect sales objections
    const objections = this.detectSalesObjections(text);
    
    // Customer engagement score based on talk ratio, sentiment, etc.
    let customerEngagement = 70; // Base score
    
    // If customer is talking a good amount (between 40-60%), that's a good sign
    if (talkRatio.customer >= 40 && talkRatio.customer <= 60) {
      customerEngagement += 15;
    } else if (talkRatio.customer < 30 || talkRatio.customer > 70) {
      customerEngagement -= 10; // Either dominating or barely participating
    }
    
    // Sentiment affects engagement
    const sentiment = this.analyzeSentiment(text);
    if (sentiment === 'positive') customerEngagement += 10;
    if (sentiment === 'negative') customerEngagement -= 15;
    
    // More objections typically means lower engagement
    customerEngagement -= objections.count * 5;
    
    // Cap to 0-100 range
    customerEngagement = Math.max(0, Math.min(100, customerEngagement));
    
    // Create final metrics object
    const metrics = {
      duration: finalDuration,
      words: totalWords,
      talkRatio,
      speakingSpeed,
      fillerWords: {
        count: totalFillerWords,
        perMinute: fillerWordsPerMinute,
        breakdown: fillerWordCounts
      },
      objections: {
        count: objections.count,
        instances: objections.instances
      },
      sentiment,
      customerEngagement
    };
    
    // Cache results
    this.cachedMetrics.set(cacheKey, metrics);
    
    return metrics;
  }
  
  // Helper: Ensure we have segments with speaker information
  private ensureSegments(text: string, segments: any[], numberOfSpeakers: number) {
    if (!segments || segments.length === 0) {
      // Create basic segments if none provided
      const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
      const avgDuration = 30 / sentences.length;
      
      return sentences.map((sentence, index) => {
        const speakerIndex = index % numberOfSpeakers;
        return {
          id: index + 1,
          start: index * avgDuration,
          end: (index + 1) * avgDuration,
          text: sentence.trim(),
          speaker: speakerIndex === 0 ? "Agent" : "Customer",
          confidence: 0.8
        };
      });
    }
    
    // Use existing segments, ensuring they have speaker info
    return segments.map((segment, index) => {
      if (!segment.speaker) {
        const speakerIndex = index % numberOfSpeakers;
        segment.speaker = speakerIndex === 0 ? "Agent" : "Customer";
      }
      return segment;
    });
  }
  
  // Detect filler words in text
  private detectFillerWords(text: string): Record<string, number> {
    const fillerWordCounts: Record<string, number> = {};
    const lowerText = text.toLowerCase();
    
    this.fillerWords.forEach(fillerWord => {
      const regex = new RegExp(`\\b${fillerWord}\\b`, 'gi');
      const matches = lowerText.match(regex);
      if (matches && matches.length > 0) {
        fillerWordCounts[fillerWord] = matches.length;
      }
    });
    
    return fillerWordCounts;
  }
  
  // Detect sales objections in text
  private detectSalesObjections(text: string): { count: number; instances: string[] } {
    const lowerText = text.toLowerCase();
    let totalCount = 0;
    const instances: string[] = [];
    
    this.objectionPhrases.forEach(phrase => {
      if (lowerText.includes(phrase)) {
        totalCount++;
        
        // Find surrounding context (20 chars before and after)
        const index = lowerText.indexOf(phrase);
        const start = Math.max(0, index - 20);
        const end = Math.min(lowerText.length, index + phrase.length + 20);
        const context = text.substring(start, end).trim();
        
        instances.push(`"${context}" (contains "${phrase}")`);
      }
    });
    
    return {
      count: totalCount,
      instances
    };
  }
  
  // Clear caches to free memory
  public clearCaches(): void {
    this.cachedSentiments.clear();
    this.cachedKeywords.clear();
    this.cachedScores.clear();
    this.cachedMetrics.clear();
  }
}

// Create a singleton instance to be used throughout the app
export const transcriptAnalysisService = new TranscriptAnalysisService();
