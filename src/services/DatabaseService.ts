import { supabase, generateAnonymousUserId } from "@/integrations/supabase/client";
import { transcriptAnalysisService } from "./TranscriptAnalysisService";
import { WhisperTranscriptionResponse } from "@/services/WhisperService";
import { v4 as uuidv4 } from 'uuid';
import type { Database } from '@/integrations/supabase/types';
import { databaseLogger as logger } from './LoggingService';
import { errorHandler } from './ErrorHandlingService';
import { userService } from './UserService';
import { reportError, ErrorCategory } from './ErrorBridgeService';
import { analyticsRepository } from "./repositories/AnalyticsRepository";

export class DatabaseService {
  // Store metadata column check state with TTL
  private metadataColumnInfo = {
    exists: null as boolean | null,
    lastChecked: 0, // Timestamp of last check
    checkInterval: 3600000, // Recheck every 1 hour (in milliseconds)
  };

  // Save transcript to call_transcripts table
  public async saveTranscriptToDatabase(
    result: WhisperTranscriptionResponse, 
    file: File, 
    userId: string | null,
    numSpeakers: number
  ): Promise<{ id: string; error: Error | string | null }> {
    try {
      const transcriptId = result.id || uuidv4();
      logger.info(`Saving transcript with ID: ${transcriptId}`);
      
      // Extra validation before saving - ensure we have a valid file type
      if (file.type.includes('text/plain')) {
        logger.error(`Rejecting text/plain file before database save: ${file.name}`);
        return { 
          id: transcriptId, 
          error: 'Content-Type not acceptable: text/plain. The Whisper API requires audio file formats.' 
        };
      }
      
      // Validate input data
      if (!result || !result.text) {
        logger.error('Invalid transcription result', { result });
        return { id: '', error: 'Invalid transcription result: missing text content' };
      }
      
      // Enhanced file type verification - more complete than previous check
      const fileType = file.type;
      const fileName = file.name;
      const fileExtension = fileName.split('.').pop()?.toLowerCase();
      
      logger.debug(`Verifying file: ${fileName}, type: ${fileType}, extension: ${fileExtension}`);
      
      // If file was successfully transcribed by WhisperService, we should trust it
      // Only reject if it's explicitly a text file with no audio characteristics
      if (fileType === 'text/plain' && (!fileExtension || ['txt', 'text', 'csv', 'json'].includes(fileExtension))) {
        logger.error(`Rejecting explicit text/plain file with text extension: ${fileName}`);
        return { id: '', error: 'Content-Type not acceptable: text/plain' };
      }
      
      const transcriptSegments = numSpeakers > 1 
        ? transcriptAnalysisService.splitBySpeaker(result.text, result.segments, numSpeakers)
        : result.segments; // Keep original segments if only one speaker
      
      const duration = result.duration || await this.calculateAudioDuration(file);
      
      let finalUserId = userId ? userService.normalizeUserId(userId) : null;
      if (!finalUserId) {
          const currentUser = await userService.getCurrentUser();
          finalUserId = currentUser?.id || generateAnonymousUserId(); 
      }
      logger.info(`Using user_id: ${finalUserId}`);
      
      const timestamp = new Date().toISOString();
      
      // Prepare data with ONLY the fields available directly from transcription
      // Analysis fields (sentiment, keywords, scores, etc.) will be populated later by Edge Function/Trigger
      const transcriptData: Database['public']['Tables']['call_transcripts']['Insert'] = {
        id: transcriptId,
        user_id: finalUserId,
        filename: file.name,
        text: result.text,
        duration: duration ?? null,
        language: result.language, // Keep language if Whisper provides it
        transcript_segments: transcriptSegments ? transcriptSegments : null, // Store raw segments if available
        created_at: timestamp,
        // Initialize analysis fields as NULL 
        sentiment: null,
        sentiment_score: null,
        keywords: null,
        call_score: null,
        talk_ratio_agent: null,
        talk_ratio_customer: null,
        metadata: null 
      };
      
      // Remove undefined keys just in case
      Object.keys(transcriptData).forEach(key => transcriptData[key] === undefined && delete transcriptData[key]);

      // Insert base transcript data into database
      logger.debug(`Attempting to insert base transcript data for ID: ${transcriptId}`);
      const { data, error } = await supabase
        .from('call_transcripts')
        .insert(transcriptData)
        .select('id') // Select only ID, as other fields might be updated by trigger/function
        .single();
        
      if (error) {
        logger.error('Error inserting base transcript into database', error);
        return { id: transcriptId, error };
      }
      
      logger.info('Successfully inserted base transcript', { id: data?.id || transcriptId });
      
      // IMPORTANT: Trigger analysis function here IF using direct invocation (Option 2)
      // Example: await supabase.functions.invoke('analyze-transcript', { body: { record: { id: transcriptId, text: result.text } } })
      
      return { id: data?.id || transcriptId, error: null };
      
    } catch (error) {
      logger.error('Error in saveTranscriptToDatabase', error);
      errorHandler.handleError({ message: 'Failed to save transcript', technical: error, severity: 'error'}, 'DatabaseService');
      return { id: '', error };
    }
  }
  
  // Update calls table for real-time metrics
  private async updateCallsTable(callData: Database['public']['Tables']['calls']['Insert']): Promise<void> {
    try {
      logger.debug('Updating calls table', { id: callData.id });
      const { error } = await supabase
        .from('calls')
        .insert(callData);
      
      if (error) {
        logger.error('Error updating calls table', error);
        
        errorHandler.handleError({
          message: 'Failed to update calls table',
          technical: error,
          severity: 'warning',
          code: 'DB_UPDATE_CALLS_ERROR'
        }, 'DatabaseService');
      } else {
        logger.info('Successfully updated calls table', { id: callData.id });
      }
    } catch (error) {
      logger.error('Exception updating calls table', error);
      
      errorHandler.handleError({
        message: 'Exception while updating calls table',
        technical: error,
        severity: 'warning',
        code: 'DB_UPDATE_CALLS_EXCEPTION'
      }, 'DatabaseService');
    }
  }
  
  // Update keyword trends in Supabase
  public async updateKeywordTrends(result: WhisperTranscriptionResponse): Promise<void> {
    const keywords = transcriptAnalysisService.extractKeywords(result.text);
    const sentiment = transcriptAnalysisService.analyzeSentiment(result.text);
    
    let category: 'positive' | 'neutral' | 'negative' = 'neutral';
    if (sentiment === 'positive') category = 'positive';
    if (sentiment === 'negative') category = 'negative';
    
    logger.info(`Updating keyword trends for ${keywords.length} keywords with sentiment ${sentiment}`);
    
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
            
          logger.debug(`Updated existing keyword trend: ${keyword}, count: ${(data.count || 1) + 1}`);
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
            
          logger.debug(`Created new keyword trend: ${keyword}`);
        }
      } catch (error) {
        logger.error(`Error updating keyword trend for ${keyword}`, error);
        
        errorHandler.handleError({
          message: `Failed to update keyword trend for "${keyword}"`,
          technical: error,
          severity: 'warning',
          code: 'DB_UPDATE_KEYWORD_ERROR'
        }, 'DatabaseService');
      }
    }
  }
  
  // Update sentiment trends in Supabase
  public async updateSentimentTrends(
    result: WhisperTranscriptionResponse, 
    userId: string | null
  ): Promise<void> {
    try {
      if (!result || !result.text) {
        logger.warn('Invalid transcription result for sentiment trends update');
        return;
      }
      
      // Normalize userId consistently
      const normalizedUserId = userId ? userService.normalizeUserId(userId) : (await userService.getCurrentUser()).id;
      
      // Get sentiment from transcript
      const sentiment = result.sentiment || 'neutral';
      
      // Insert sentiment trend data
      await supabase.from('sentiment_trends').insert({
        user_id: normalizedUserId,
        sentiment,
        timestamp: new Date().toISOString()
      });
      
      logger.debug('Updated sentiment trends');
    } catch (error) {
      logger.error('Failed to update sentiment trends', error);
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
        logger.warn(`Failed to get audio duration from metadata, estimating from file size: ~${estimatedSeconds}s`);
        resolve(estimatedSeconds > 0 ? estimatedSeconds : 60); // Default to 60 seconds if calculation fails
      });
    });
  }
}

export const databaseService = new DatabaseService();
