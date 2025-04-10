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
  public calculateCallMetrics(text: string, segments: any[], words: any[] = [], duration: number) {
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
      const segmentWords = segment.text.split(/\s+/).filter((w: string) => w.length > 0);
      totalWords += segmentWords.length;
      
      if (segment.speaker === "Agent") {
        agentTalkTime += segmentDuration;
        agentWords += segmentWords.length;
      } else {
        customerTalkTime += segmentDuration;
        customerWords += segmentWords.length;
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
    
    // Enhanced metrics using word-level data when available
    let interruptions = { count: 0, instances: [] };
    let pauseAnalysis = { count: 0, avgDuration: 0, longPauses: [] };
    let wordEmphasis = { words: [], count: 0 };
    
    // If word-level timestamps are available, calculate enhanced metrics
    if (words && words.length > 0) {
      interruptions = this.detectInterruptions(processedSegments, words);
      pauseAnalysis = this.analyzePauses(words);
      wordEmphasis = this.detectEmphasisWords(words);
      
      // Improve speaking speed calculation with word-level data
      if (words.length > 0) {
        const wordDurations = this.calculateWordDurations(words);
        
        // Update speaking speed with more accurate data
        speakingSpeed.overall = wordDurations.wordsPerMinute;
        
        // If we have speaker information in the words
        if (words[0].speaker) {
          speakingSpeed.agent = wordDurations.agentWordsPerMinute || speakingSpeed.agent;
          speakingSpeed.customer = wordDurations.customerWordsPerMinute || speakingSpeed.customer;
        }
      }
    }
    
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
      customerEngagement,
      // Add enhanced metrics when available
      interruptions,
      pauses: pauseAnalysis,
      emphasis: wordEmphasis
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
  
  // Detect interruptions between speakers using word-level timestamps
  private detectInterruptions(segments: any[], words: any[]): { count: number, instances: any[] } {
    if (!words || words.length < 2 || !segments || segments.length < 2) {
      return { count: 0, instances: [] };
    }
    
    const interruptions = [];
    let interruptionCount = 0;
    
    // Function to find which segment a word belongs to based on its timestamp
    const findSpeakerForWord = (word: any) => {
      for (const segment of segments) {
        if (word.start >= segment.start && word.end <= segment.end) {
          return segment.speaker || null;
        }
      }
      return null;
    };
    
    // If words already have speaker information, use that instead
    const haveWordSpeakers = words.some(w => w.speaker);
    
    // Analyze adjacent words to detect speaker changes
    for (let i = 1; i < words.length; i++) {
      const prevWord = words[i-1];
      const currentWord = words[i];
      
      // Get speakers for these words
      const prevSpeaker = haveWordSpeakers ? prevWord.speaker : findSpeakerForWord(prevWord);
      const currentSpeaker = haveWordSpeakers ? currentWord.speaker : findSpeakerForWord(currentWord);
      
      // Skip if we can't determine speakers
      if (!prevSpeaker || !currentSpeaker) continue;
      
      // Check if speakers are different
      if (prevSpeaker !== currentSpeaker) {
        // Check if there's minimal gap between words (potential interruption)
        const timeBetween = currentWord.start - prevWord.end;
        
        // If the gap is very small (less than 300ms), it might be an interruption
        if (timeBetween < 0.3) {
          interruptionCount++;
          interruptions.push({
            time: prevWord.end,
            interruptedSpeaker: prevSpeaker,
            interruptingSpeaker: currentSpeaker,
            interruptedWord: prevWord.word,
            interruptingWord: currentWord.word
          });
        }
      }
    }
    
    return {
      count: interruptionCount,
      instances: interruptions
    };
  }
  
  // Analyze pauses between words
  private analyzePauses(words: any[]): { count: number, avgDuration: number, longPauses: any[] } {
    if (!words || words.length < 2) {
      return { count: 0, avgDuration: 0, longPauses: [] };
    }
    
    const pauseThreshold = 0.5; // Pauses longer than 500ms
    const longPauseThreshold = 2.0; // Long pauses (2+ seconds)
    
    const pauses = [];
    let totalPauseDuration = 0;
    let pauseCount = 0;
    
    // Analyze gaps between words
    for (let i = 1; i < words.length; i++) {
      const prevWord = words[i-1];
      const currentWord = words[i];
      
      // Check if these words have the same speaker
      const sameSpeaker = !prevWord.speaker || !currentWord.speaker || 
                          prevWord.speaker === currentWord.speaker;
      
      // Only count pauses from the same speaker
      if (sameSpeaker) {
        const pauseDuration = currentWord.start - prevWord.end;
        
        if (pauseDuration >= pauseThreshold) {
          pauseCount++;
          totalPauseDuration += pauseDuration;
          
          if (pauseDuration >= longPauseThreshold) {
            pauses.push({
              start: prevWord.end,
              end: currentWord.start,
              duration: pauseDuration,
              prevWord: prevWord.word,
              nextWord: currentWord.word,
              speaker: prevWord.speaker || 'unknown'
            });
          }
        }
      }
    }
    
    return {
      count: pauseCount,
      avgDuration: pauseCount > 0 ? totalPauseDuration / pauseCount : 0,
      longPauses: pauses
    };
  }
  
  // Detect emphasized words based on context and timing
  private detectEmphasisWords(words: any[]): { words: string[], count: number } {
    if (!words || words.length < 3) {
      return { words: [], count: 0 };
    }
    
    const emphasisWords = [];
    
    // Calculate the average word duration
    let totalDuration = 0;
    words.forEach(word => {
      totalDuration += (word.end - word.start);
    });
    const avgWordDuration = totalDuration / words.length;
    
    // Words that are significantly longer might be emphasized
    const durationThreshold = avgWordDuration * 1.5;
    
    // Words that might indicate emphasis
    const emphasisIndicators = [
      'very', 'really', 'extremely', 'absolutely', 'definitely',
      'crucial', 'critical', 'essential', 'important', 'significant',
      'must', 'need', 'should', 'highly', 'strongly'
    ];
    
    // Check for words that are emphasized by duration or context
    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      const wordDuration = word.end - word.start;
      const wordText = word.word.toLowerCase();
      
      // Skip very short words (likely not emphasized)
      if (wordText.length < 3) continue;
      
      // Check if this word is significantly longer than average
      const isLongerDuration = wordDuration > durationThreshold;
      
      // Check if it follows an emphasis indicator
      let followsIndicator = false;
      if (i > 0) {
        const prevWord = words[i-1].word.toLowerCase();
        followsIndicator = emphasisIndicators.includes(prevWord);
      }
      
      // Check if it's in all caps (might indicate emphasis in transcript)
      const isAllCaps = word.word === word.word.toUpperCase() && word.word.length > 1;
      
      // If any emphasis condition is met, add to the list
      if (isLongerDuration || followsIndicator || isAllCaps) {
        emphasisWords.push(word.word);
      }
    }
    
    // Remove duplicates
    const uniqueEmphasisWords = [...new Set(emphasisWords)];
    
    return {
      words: uniqueEmphasisWords,
      count: uniqueEmphasisWords.length
    };
  }
  
  // Calculate word durations and speaking rate from word-level timestamps
  private calculateWordDurations(words: any[]) {
    if (!words || words.length === 0) {
      return { 
        wordsPerMinute: 0,
        agentWordsPerMinute: 0,
        customerWordsPerMinute: 0
      };
    }
    
    let totalWords = words.length;
    let agentWords = 0;
    let customerWords = 0;
    
    // Calculate total duration from first to last word
    const firstWordStart = words[0].start;
    const lastWordEnd = words[words.length - 1].end;
    const totalDuration = (lastWordEnd - firstWordStart) / 60; // Convert to minutes
    
    // If we have speaker information
    if (words[0].speaker) {
      let agentTalkTime = 0;
      let customerTalkTime = 0;
      let currentSpeaker = words[0].speaker;
      let speakerStartTime = words[0].start;
      
      // Count words by speaker
      words.forEach(word => {
        if (word.speaker === 'Agent') {
          agentWords++;
        } else if (word.speaker === 'Customer') {
          customerWords++;
        }
        
        // Detect speaker changes to calculate talk time
        if (word.speaker !== currentSpeaker) {
          const speakerEndTime = word.start;
          const duration = speakerEndTime - speakerStartTime;
          
          if (currentSpeaker === 'Agent') {
            agentTalkTime += duration;
          } else if (currentSpeaker === 'Customer') {
            customerTalkTime += duration;
          }
          
          // Reset for next speaker
          currentSpeaker = word.speaker;
          speakerStartTime = word.start;
        }
      });
      
      // Add final speaker segment
      const duration = lastWordEnd - speakerStartTime;
      if (currentSpeaker === 'Agent') {
        agentTalkTime += duration;
      } else if (currentSpeaker === 'Customer') {
        customerTalkTime += duration;
      }
      
      // Convert to minutes
      agentTalkTime /= 60;
      customerTalkTime /= 60;
      
      return {
        wordsPerMinute: totalDuration > 0 ? totalWords / totalDuration : 0,
        agentWordsPerMinute: agentTalkTime > 0 ? agentWords / agentTalkTime : 0,
        customerWordsPerMinute: customerTalkTime > 0 ? customerWords / customerTalkTime : 0
      };
    }
    
    // If no speaker information, just calculate overall rate
    return {
      wordsPerMinute: totalDuration > 0 ? totalWords / totalDuration : 0,
      agentWordsPerMinute: 0,
      customerWordsPerMinute: 0
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
