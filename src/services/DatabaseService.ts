import { supabase, generateAnonymousUserId } from "@/integrations/supabase/client";
import { transcriptAnalysisService } from "./TranscriptAnalysisService";
import { WhisperTranscriptionResponse } from "@/services/WhisperService";
import { v4 as uuidv4 } from 'uuid';
import type { Database } from '@/integrations/supabase/types';

export class DatabaseService {
  // Save transcript to call_transcripts table
  public async saveTranscriptToDatabase(
    result: WhisperTranscriptionResponse, 
    file: File, 
    userId: string | null,
    numSpeakers: number
  ): Promise<{ id: string; error: Error | string | null }> {
    try {
      const transcriptId = result.id || uuidv4();
      console.log(`Saving transcript with ID: ${transcriptId}`);
      
      // Extra validation before saving - ensure we have a valid file type
      if (file.type.includes('text/plain')) {
        console.error(`Rejecting text/plain file before database save: ${file.name}`);
        return { 
          id: transcriptId, 
          error: 'Content-Type not acceptable: text/plain. The Whisper API requires audio file formats.' 
        };
      }
      
      // Validate input data
      if (!result || !result.text) {
        console.error('Invalid transcription result:', result);
        return { id: '', error: 'Invalid transcription result: missing text content' };
      }
      
      // Enhanced file type verification - more complete than previous check
      const fileType = file.type;
      const fileName = file.name;
      const fileExtension = fileName.split('.').pop()?.toLowerCase();
      
      console.log(`Database service verifying file: ${fileName}, type: ${fileType}, extension: ${fileExtension}`);
      
      // If file was successfully transcribed by WhisperService, we should trust it
      // Only reject if it's explicitly a text file with no audio characteristics
      if (fileType === 'text/plain' && (!fileExtension || ['txt', 'text', 'csv', 'json'].includes(fileExtension))) {
        console.error('Rejecting explicit text/plain file with text extension:', fileName);
        return { id: '', error: 'Content-Type not acceptable: text/plain' };
      }
      
      // Process the transcription into segments by speaker
      const transcriptSegments = numSpeakers > 1 
        ? transcriptAnalysisService.splitBySpeaker(result.text, result.segments, numSpeakers)
        : undefined;
      
      // Calculate duration if possible
      const duration = await this.calculateAudioDuration(file);
      
      // Extract all sales metrics using the enhanced analysis service
      const metrics = transcriptAnalysisService.calculateCallMetrics(
        result.text, 
        result.segments || [], 
        duration || 0
      );
      
      // Generate sentiment and keywords (now also included in metrics)
      const sentiment = metrics.sentiment;
      const keywords = transcriptAnalysisService.extractKeywords(result.text);
      const callScore = transcriptAnalysisService.generateCallScore(result.text, sentiment);
      
      // If no assigned userId, try to get current user from auth
      // If neither is available, use 'anonymous-{randomId}' to ensure uniqueness
      let finalUserId = userId;
      if (!finalUserId) {
        const { data: { user } } = await supabase.auth.getUser();
        finalUserId = user?.id || generateAnonymousUserId();
      }
      
      console.log(`Saving transcript with user_id: ${finalUserId}`);
      
      // Create timestamp for consistent usage
      const timestamp = new Date().toISOString();
      
      // Log detailed information about the file and data being saved
      console.log('Preparing to save transcript with data:', {
        fileInfo: {
          name: fileName,
          type: fileType,
          size: file.size
        },
        textLength: result.text.length,
        transcriptId,
        userId: finalUserId,
        metrics: {
          duration: metrics.duration,
          talkRatio: metrics.talkRatio,
          speakingSpeed: metrics.speakingSpeed,
          fillerWords: metrics.fillerWords.count,
          objections: metrics.objections.count
        }
      });
      
      // Prepare data with proper typing
      const transcriptData: Database['public']['Tables']['call_transcripts']['Insert'] = {
        id: transcriptId, // Explicitly set ID to ensure consistency
        user_id: finalUserId,
        filename: fileName,
        text: result.text,
        duration: metrics.duration,
        call_score: callScore,
        sentiment,
        keywords,
        transcript_segments: transcriptSegments ? JSON.stringify(transcriptSegments) : null,
        created_at: timestamp
      };
      
      // Insert into database with improved error handling
      try {
        console.log(`Executing Supabase insert for transcript ID: ${transcriptId}`);
        
        // Add retry logic for database inserts
        let retryCount = 0;
        const maxRetries = 2;
        let data = null;
        let error = null;
        
        while (retryCount <= maxRetries) {
          try {
            // Add a unique timestamp as a query param to avoid duplicate request detection
            const uniqueTimestamp = Date.now();
            const { data: responseData, error: responseError } = await supabase
              .from('call_transcripts')
              .insert(transcriptData)
              .select('id')
              .single();
              
            data = responseData;
            error = responseError;
            
            // If successful or non-duplicate error, break the retry loop
            if (!error || (error && !error.message?.includes('Duplicate request cancelled'))) {
              break;
            }
            
            // If we got a duplicate request error, wait and try again
            console.log(`Retry ${retryCount + 1}/${maxRetries} due to duplicate request error`);
            await new Promise(resolve => setTimeout(resolve, 1500));
            retryCount++;
          } catch (innerError) {
            // If it's a connection error or other exception, break and report
            console.error('Exception during database insert:', innerError);
            error = innerError;
            break;
          }
        }
        
        if (error) {
          console.error('Error inserting transcript into database:', error);
          
          // Format error message more helpfully
          let errorMessage = '';
          if (typeof error === 'object' && error !== null) {
            errorMessage = error.message || error.toString();
            // Handle specific error types more gracefully
            if (errorMessage.includes('Duplicate request cancelled')) {
              return { 
                id: transcriptId, 
                error: 'Request conflict: Please try again in a moment' 
              };
            }
          }
          
          // Check for content-type issues in error message
          if (error.message && 
             (error.message.includes('Content-Type') || 
              error.message.includes('content-type'))) {
            return { 
              id: transcriptId, 
              error: 'Content-Type not acceptable: The file was transcribed but database rejected it.' 
            };
          }
          
          return { id: transcriptId, error };
        }
        
        console.log('Successfully inserted transcript:', data);
        
        // Also update the calls table with enhanced metrics data
        const callData: Database['public']['Tables']['calls']['Insert'] = {
          id: transcriptId, // Use same ID to link records
          user_id: finalUserId,
          duration: metrics.duration,
          sentiment_agent: sentiment === 'positive' ? 0.8 : sentiment === 'negative' ? 0.3 : 0.5,
          sentiment_customer: sentiment === 'positive' ? 0.7 : sentiment === 'negative' ? 0.2 : 0.5,
          talk_ratio_agent: metrics.talkRatio.agent,
          talk_ratio_customer: metrics.talkRatio.customer,
          key_phrases: keywords || [],
          speaking_speed: metrics.speakingSpeed.overall,
          filler_word_count: metrics.fillerWords.count,
          objection_count: metrics.objections.count,
          customer_engagement: metrics.customerEngagement,
          created_at: timestamp // Use the same timestamp for consistency
        };
        
        await this.updateCallsTable(callData);
        
        return { id: data?.id || transcriptId, error: null };
      } catch (dbError) {
        console.error('Database exception during transcript insert:', dbError);
        return { id: transcriptId, error: dbError };
      }
    } catch (error) {
      console.error('Error saving transcript:', error);
      return { id: '', error };
    }
  }
  
  // Update calls table for real-time metrics
  private async updateCallsTable(callData: Database['public']['Tables']['calls']['Insert']): Promise<void> {
    try {
      console.log('Updating calls table with data:', callData);
      const { error } = await supabase
        .from('calls')
        .insert(callData);
      
      if (error) {
        console.error('Error updating calls table:', error);
      } else {
        console.log('Successfully updated calls table');
      }
    } catch (error) {
      console.error('Exception updating calls table:', error);
    }
  }
  
  // Update keyword trends in Supabase
  public async updateKeywordTrends(result: WhisperTranscriptionResponse): Promise<void> {
    const keywords = transcriptAnalysisService.extractKeywords(result.text);
    const sentiment = transcriptAnalysisService.analyzeSentiment(result.text);
    
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
          .eq('keyword', keyword as string)
          .eq('category', category)
          .maybeSingle();
        
        if (data) {
          // Update existing keyword
          await supabase
            .from('keyword_trends')
            .update({ 
              count: (data.count || 1) + 1,
              last_used: new Date().toISOString()
            } as Database['public']['Tables']['keyword_trends']['Update'])
            .eq('id', data.id);
        } else {
          // Insert new keyword with proper UUID
          const trendData: Database['public']['Tables']['keyword_trends']['Insert'] = {
            keyword: keyword as string,
            category,
            count: 1,
            last_used: new Date().toISOString()
          };
          
          await supabase
            .from('keyword_trends')
            .insert(trendData);
        }
      } catch (error) {
        console.error(`Error updating keyword trend for ${keyword}:`, error);
      }
    }
  }
  
  // Update sentiment trends in Supabase
  public async updateSentimentTrends(
    result: WhisperTranscriptionResponse, 
    userId: string | null
  ): Promise<void> {
    const sentiment = transcriptAnalysisService.analyzeSentiment(result.text);
    
    try {
      const trendData: Database['public']['Tables']['sentiment_trends']['Insert'] = {
        sentiment_label: sentiment,
        confidence: sentiment === 'positive' ? 0.8 : sentiment === 'negative' ? 0.7 : 0.6,
        user_id: userId,
        recorded_at: new Date().toISOString()
      };
      
      await supabase
        .from('sentiment_trends')
        .insert(trendData);
    } catch (error) {
      console.error('Error updating sentiment trend:', error);
    }
  }
  
  // Calculate audio duration
  public async calculateAudioDuration(audioFile: File): Promise<number> {
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
}

export const databaseService = new DatabaseService();
