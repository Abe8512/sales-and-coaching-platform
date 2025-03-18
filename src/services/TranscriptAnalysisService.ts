
// A service for analyzing transcript text and extracting insights
export class TranscriptAnalysisService {
  private cachedSentiments = new Map<string, string>();
  private cachedKeywords = new Map<string, string[]>();
  private cachedScores = new Map<string, number>();
  
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
  
  // Clear caches to free memory
  public clearCaches(): void {
    this.cachedSentiments.clear();
    this.cachedKeywords.clear();
    this.cachedScores.clear();
  }
}

// Create a singleton instance to be used throughout the app
export const transcriptAnalysisService = new TranscriptAnalysisService();
