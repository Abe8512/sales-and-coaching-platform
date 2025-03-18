
import { supabase } from "@/integrations/supabase/client";
import { useBulkUploadStore, UploadStatus } from "@/store/useBulkUploadStore";
import { useWhisperService, WhisperTranscriptionResponse } from "@/services/WhisperService";

// Create a wrapper class for handling bulk uploads
export class BulkUploadService {
  private whisperService: ReturnType<typeof useWhisperService>;
  
  constructor(whisperService: ReturnType<typeof useWhisperService>) {
    this.whisperService = whisperService;
  }
  
  // Process a single file
  public async processFile(file: File, updateStatus: (status: UploadStatus, progress: number, result?: string, error?: string, transcriptId?: string) => void): Promise<string | null> {
    try {
      // Update status to processing
      updateStatus('processing', 10);
      
      // Transcribe the audio file
      const result = await this.whisperService.transcribeAudio(file);
      
      if (!result) {
        throw new Error("Transcription failed");
      }
      
      updateStatus('processing', 50, result.text);
      
      // Save to database directly
      const { id, error } = await this.saveTranscriptToDatabase(result, file);
      
      if (error) {
        throw new Error(`Failed to save transcript: ${error.message}`);
      }
      
      // Update keywords and sentiment trends
      await this.updateKeywordTrends(result);
      await this.updateSentimentTrends(result);
      
      updateStatus('complete', 100, result.text, undefined, id);
      
      return id;
    } catch (error) {
      console.error(`Error processing file ${file.name}:`, error);
      updateStatus('error', 100, undefined, error instanceof Error ? error.message : "Processing failed");
      return null;
    }
  }
  
  // Save transcript to call_transcripts table
  private async saveTranscriptToDatabase(result: WhisperTranscriptionResponse, file: File): Promise<{ id: string; error: any }> {
    try {
      // Process the transcription into segments by speaker
      const transcriptSegments = this.whisperService.getNumSpeakers() > 1 
        ? this.splitBySpeaker(result, this.whisperService.getNumSpeakers())
        : undefined;
      
      // Generate sentiment and keywords
      const sentiment = this.analyzeSentiment(result.text);
      const keywords = this.extractKeywords(result.text);
      const callScore = this.generateCallScore(result.text, sentiment);
      
      // Calculate duration if possible
      const duration = await this.calculateAudioDuration(file);
      
      // Insert into database
      const { data, error } = await supabase
        .from('call_transcripts')
        .insert({
          filename: file.name,
          text: result.text,
          duration,
          call_score: callScore,
          sentiment,
          keywords,
          transcript_segments: transcriptSegments ? JSON.stringify(transcriptSegments) : null,
          created_at: new Date().toISOString()
        })
        .select('id')
        .single();
      
      return { id: data?.id || '', error };
    } catch (error) {
      console.error('Error saving transcript:', error);
      return { id: '', error };
    }
  }
  
  // Split transcript into segments by speaker
  private splitBySpeaker(result: WhisperTranscriptionResponse, numberOfSpeakers: number = 2): any[] {
    if (!result.segments || result.segments.length === 0) {
      // If no segments, create a single segment with the full text
      return [{
        id: 1,
        start: 0,
        end: 30, // Arbitrary end time if not known
        text: result.text,
        speaker: "Agent", // Default to Agent
        confidence: 0.9
      }];
    }
    
    // Simple algorithm to alternate speakers
    const segments = result.segments.map((segment, index) => {
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
    
    return segments;
  }
  
  // Update keyword trends in Supabase
  private async updateKeywordTrends(result: WhisperTranscriptionResponse): Promise<void> {
    const keywords = this.extractKeywords(result.text);
    const sentiment = this.analyzeSentiment(result.text);
    
    let category: 'positive' | 'neutral' | 'negative' = 'neutral';
    if (sentiment === 'positive') category = 'positive';
    if (sentiment === 'negative') category = 'negative';
    
    // Add top keywords to trends
    for (const keyword of keywords.slice(0, 5)) {
      try {
        // First check if keyword exists
        const { data } = await supabase
          .from('keyword_trends')
          .select('*')
          .eq('keyword', keyword)
          .eq('category', category);
        
        if (data && data.length > 0) {
          // Update existing keyword
          await supabase
            .from('keyword_trends')
            .update({ 
              count: data[0].count + 1,
              last_used: new Date().toISOString()
            })
            .eq('id', data[0].id);
        } else {
          // Insert new keyword
          await supabase
            .from('keyword_trends')
            .insert({
              keyword,
              category,
              count: 1,
              last_used: new Date().toISOString()
            });
        }
      } catch (error) {
        console.error(`Error updating keyword trend for ${keyword}:`, error);
      }
    }
  }
  
  // Update sentiment trends in Supabase
  private async updateSentimentTrends(result: WhisperTranscriptionResponse): Promise<void> {
    const sentiment = this.analyzeSentiment(result.text);
    
    try {
      await supabase
        .from('sentiment_trends')
        .insert({
          sentiment_label: sentiment,
          confidence: sentiment === 'positive' ? 0.8 : sentiment === 'negative' ? 0.7 : 0.6,
          recorded_at: new Date().toISOString()
        });
    } catch (error) {
      console.error('Error updating sentiment trend:', error);
    }
  }
  
  // Calculate audio duration
  private async calculateAudioDuration(audioFile: File): Promise<number> {
    return new Promise((resolve) => {
      const audioUrl = URL.createObjectURL(audioFile);
      const audio = new Audio(audioUrl);
      
      audio.addEventListener('loadedmetadata', () => {
        const duration = audio.duration;
        URL.revokeObjectURL(audioUrl);
        resolve(Math.round(duration));
      });
      
      // Fallback if metadata doesn't load properly
      audio.addEventListener('error', () => {
        URL.revokeObjectURL(audioUrl);
        // Estimate duration based on file size (very rough approximation)
        // Assuming 16bit 16kHz mono audio (~32kB per second)
        const estimatedSeconds = Math.round(audioFile.size / 32000);
        resolve(estimatedSeconds > 0 ? estimatedSeconds : 60); // Default to 60 seconds if calculation fails
      });
    });
  }
  
  // Analyze text and generate a sentiment score
  private analyzeSentiment(text: string): 'positive' | 'neutral' | 'negative' {
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
    
    if (positiveScore > negativeScore * 1.5) return 'positive';
    if (negativeScore > positiveScore * 1.5) return 'negative';
    return 'neutral';
  }
  
  // Extract keywords from text
  private extractKeywords(text: string): string[] {
    const stopWords = ['a', 'an', 'the', 'and', 'or', 'but', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'in', 'on', 'at', 'to', 'for', 'with', 'by', 'about', 'of', 'that', 'this', 'these', 'those'];
    const words = text.toLowerCase().match(/\b(\w+)\b/g) || [];
    const wordFrequency: Record<string, number> = {};
    
    words.forEach(word => {
      if (!stopWords.includes(word) && word.length > 2) {
        wordFrequency[word] = (wordFrequency[word] || 0) + 1;
      }
    });
    
    return Object.entries(wordFrequency)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(entry => entry[0]);
  }
  
  // Generate a call score
  private generateCallScore(text: string, sentiment: string): number {
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
    
    // Add some randomness (within 5 points)
    score += Math.floor(Math.random() * 10) - 5;
    
    // Ensure score is between 0-100
    return Math.max(0, Math.min(100, score));
  }
}

// Hook for using bulk upload functionality
export const useBulkUploadService = () => {
  const whisperService = useWhisperService();
  const bulkUploadService = new BulkUploadService(whisperService);
  const { 
    files, 
    addFiles, 
    updateFileStatus, 
    removeFile, 
    clearCompleted, 
    isProcessing,
    setProcessing,
    loadUploadHistory,
    uploadHistory,
    hasLoadedHistory
  } = useBulkUploadStore();
  
  // Process all files in the queue
  const processQueue = async () => {
    if (isProcessing || files.length === 0) return;
    
    setProcessing(true);
    
    // Process files sequentially
    for (const file of files) {
      // Skip already processed files
      if (file.status === 'complete' || file.status === 'error') continue;
      
      await bulkUploadService.processFile(
        file.file,
        (status, progress, result, error, transcriptId) => {
          updateFileStatus(file.id, status, progress, result, error, transcriptId);
        }
      );
    }
    
    setProcessing(false);
  };
  
  return {
    files,
    addFiles,
    updateFileStatus,
    removeFile,
    clearCompleted,
    isProcessing,
    processQueue,
    uploadHistory,
    hasLoadedHistory,
    loadUploadHistory
  };
};
