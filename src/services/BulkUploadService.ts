import { supabase } from "@/integrations/supabase/client";
import { useBulkUploadStore, UploadStatus } from "@/store/useBulkUploadStore";
import { useWhisperService, WhisperTranscriptionResponse } from "@/services/WhisperService";
import { toast } from "sonner";
import { useCallTranscriptService } from "./CallTranscriptService";
import { useEventsStore } from "@/services/events";
import { v4 as uuidv4 } from 'uuid';

// Create a wrapper class for handling bulk uploads
export class BulkUploadService {
  private whisperService: ReturnType<typeof useWhisperService>;
  private assignedUserId: string | null = null;
  private dispatchEvent: (type: string, data?: any) => void;
  
  constructor(whisperService: ReturnType<typeof useWhisperService>) {
    this.whisperService = whisperService;
    this.dispatchEvent = useEventsStore.getState().dispatchEvent;
  }
  
  // Set the user ID to assign to the uploaded files
  public setAssignedUserId(userId: string | null) {
    this.assignedUserId = userId;
  }
  
  // Process a single file
  public async processFile(file: File, updateStatus: (status: UploadStatus, progress: number, result?: string, error?: string, transcriptId?: string) => void): Promise<string | null> {
    try {
      // Update status to processing
      updateStatus('processing', 10);
      
      this.dispatchEvent('bulk-upload-started', { 
        filename: file.name, 
        size: file.size
      });
      
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
      
      // Force a refresh of the local storage transcripts to ensure UI updates
      this.whisperService.forceRefreshTranscriptions();
      
      // Dispatch event to notify components that a new transcript has been created
      this.dispatchEvent('transcript-created', { 
        id,
        filename: file.name,
        duration: await this.calculateAudioDuration(file)
      });
      
      // Notify using toast
      toast.success("File processed successfully", {
        description: "Transcript and metrics have been updated with this call data."
      });
      
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
      
      // Get user ID either from assignment or current logged-in user
      // If neither is available, use 'anonymous-{randomId}' to ensure uniqueness
      let userId = this.assignedUserId;
      
      // If no assigned userId, try to get current user from auth
      if (!userId) {
        const { data: { user } } = await supabase.auth.getUser();
        userId = user?.id || `anonymous-${uuidv4().substring(0, 8)}`;
      }
      
      console.log(`Saving transcript with user_id: ${userId}`);
      
      // Create timestamp for consistent usage
      const timestamp = new Date().toISOString();
      
      // Create a unique ID for the transcript
      const transcriptId = uuidv4();
      
      // Insert into database
      const { data, error } = await supabase
        .from('call_transcripts')
        .insert({
          id: transcriptId,
          user_id: userId,
          filename: file.name,
          text: result.text,
          duration,
          call_score: callScore,
          sentiment,
          keywords,
          transcript_segments: transcriptSegments ? JSON.stringify(transcriptSegments) : null,
          created_at: timestamp
        })
        .select('id')
        .single();
      
      // Also update the calls table with similar data for real-time metrics
      if (!error) {
        const callId = uuidv4(); // Generate a unique ID for the call
        await this.updateCallsTable({
          id: callId,
          user_id: userId,
          duration: duration || 0,
          sentiment_agent: sentiment === 'positive' ? 0.8 : sentiment === 'negative' ? 0.3 : 0.5,
          sentiment_customer: sentiment === 'positive' ? 0.7 : sentiment === 'negative' ? 0.2 : 0.5,
          talk_ratio_agent: 50 + (Math.random() * 20 - 10), // Random value between 40-60
          talk_ratio_customer: 50 - (Math.random() * 20 - 10), // Random value between 40-60
          key_phrases: keywords || [],
          created_at: timestamp // Use the same timestamp for consistency
        });
      }
      
      return { id: data?.id || transcriptId, error };
    } catch (error) {
      console.error('Error saving transcript:', error);
      return { id: '', error };
    }
  }
  
  // Update calls table for real-time metrics
  private async updateCallsTable(callData: {
    id: string;
    user_id: string;
    duration: number;
    sentiment_agent: number;
    sentiment_customer: number;
    talk_ratio_agent: number;
    talk_ratio_customer: number;
    key_phrases: string[];
    created_at?: string;
  }): Promise<void> {
    try {
      const { error } = await supabase
        .from('calls')
        .insert(callData);
      
      if (error) {
        console.error('Error updating calls table:', error);
      }
    } catch (error) {
      console.error('Error updating calls table:', error);
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
          user_id: this.assignedUserId,
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
  const dispatchEvent = useEventsStore.getState().dispatchEvent;
  
  // Set the user ID to assign to the uploaded files
  const setAssignedUserId = (userId: string) => {
    bulkUploadService.setAssignedUserId(userId);
  };
  
  // Process all files in the queue
  const processQueue = async () => {
    if (isProcessing || files.length === 0) return;
    
    setProcessing(true);
    
    // Dispatch event that bulk upload processing has started
    dispatchEvent('bulk-upload-started', {
      fileCount: files.length,
      fileIds: files.map(f => f.id)
    });
    
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
    
    // After processing all files, trigger a reload of the history
    loadUploadHistory();
    
    // Dispatch event that bulk upload processing has completed
    dispatchEvent('bulk-upload-completed', {
      fileCount: files.length,
      fileIds: files.map(f => f.id),
      transcriptIds: files.filter(f => f.transcriptId).map(f => f.transcriptId)
    });
    
    // Notify the user that processing is complete
    toast.success("All files processed", {
      description: "Your data has been uploaded and metrics have been updated."
    });
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
    loadUploadHistory,
    setAssignedUserId
  };
};
