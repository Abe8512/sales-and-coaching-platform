import { supabase, generateAnonymousUserId } from "@/integrations/supabase/client";
import { transcriptAnalysisService } from "./TranscriptAnalysisService";
import { WhisperTranscriptionResponse } from "@/services/WhisperService";
import { v4 as uuidv4 } from 'uuid';
import type { Database } from '@/integrations/supabase/types';
import { databaseLogger as logger } from './LoggingService';
import { errorHandler } from './ErrorHandlingService';
import { userService } from './UserService';

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
        // Use the centralized user service instead of handling it directly
        const user = await userService.getCurrentUser();
        finalUserId = user.id;
      } else {
        // Normalize userId to ensure it's valid
        finalUserId = userService.normalizeUserId(userId);
      }
      
      logger.info(`Using user_id: ${finalUserId}`);
      
      // Create timestamp for consistent usage
      const timestamp = new Date().toISOString();
      
      // Log detailed information about the file and data being saved
      logger.debug('Preparing to save transcript with data', {
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
      
      // Add the metadata field if the column exists
      if (metrics) {
        logger.debug('Starting metadata check process');
        
        // Check if we need to verify column existence
        const now = Date.now();
        const shouldCheckColumn = 
          this.metadataColumnInfo.exists === null || // Never checked before
          (now - this.metadataColumnInfo.lastChecked > this.metadataColumnInfo.checkInterval); // TTL expired
        
        if (shouldCheckColumn) {
          try {
            logger.debug('Checking if metadata column exists');
            // Check if metadata column exists
            const { data: columns, error: columnsError } = await supabase
              .from('call_transcripts')
              .select('metadata')
              .limit(1)
              .maybeSingle();

            logger.debug('Metadata column check query results', { columns, errorMessage: columnsError?.message });

            // If no error or different error, assume column exists
            this.metadataColumnInfo.exists = !(columnsError && columnsError.message.includes('column "metadata" does not exist'));
            this.metadataColumnInfo.lastChecked = now;
            
            logger.debug(`Metadata column check result: ${this.metadataColumnInfo.exists ? 'exists' : 'does not exist'}`);
          } catch (err) {
            // On error checking, assume column doesn't exist, but don't cache this result for too long
            logger.error('Error checking metadata column', err);
            this.metadataColumnInfo.exists = false;
            this.metadataColumnInfo.lastChecked = now;
            this.metadataColumnInfo.checkInterval = 60000; // Retry sooner (1 minute) if there was an error
          }
        } else {
          logger.debug(`Using cached metadata column check result: ${this.metadataColumnInfo.exists ? 'exists' : 'does not exist'} (last checked ${Math.round((now - this.metadataColumnInfo.lastChecked) / 1000)} seconds ago)`);
        }
        
        // Only add metadata if column exists
        if (this.metadataColumnInfo.exists) {
          transcriptData.metadata = JSON.stringify(metrics);
          logger.debug('Added metadata to transcript');
        } else {
          logger.debug('Skipping metadata field as column does not exist');
          
          // If the metadata property exists in the transcriptData object but the column doesn't exist in the database,
          // we need to explicitly delete it to prevent the error
          if ('metadata' in transcriptData) {
            delete transcriptData.metadata;
            logger.debug('Removed metadata field from transcriptData to prevent database error');
          }
        }
        
        logger.debug(`Final transcript data structure (keys only): ${Object.keys(transcriptData).join(', ')}`);
      }
      
      // Insert into database with improved error handling
      try {
        logger.info(`Executing Supabase insert for transcript ID: ${transcriptId}`);
        
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
            logger.warn(`Retry ${retryCount + 1}/${maxRetries} due to duplicate request error`);
            await new Promise(resolve => setTimeout(resolve, 1500));
            retryCount++;
          } catch (innerError) {
            // If it's a connection error or other exception, break and report
            logger.error('Exception during database insert', innerError);
            error = innerError;
            break;
          }
        }
        
        if (error) {
          logger.error('Error inserting transcript into database', error);
          
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
            
            // Check for metadata column errors and try to recover
            if (errorMessage.includes('metadata') && errorMessage.includes('column') && 
                (errorMessage.includes('does not exist') || errorMessage.includes('schema cache'))) {
              logger.debug(`Detected metadata column error during insert with error message: ${errorMessage}`);
              logger.debug(`Original transcript data keys: ${Object.keys(transcriptData)}`);
              
              // Remove the metadata field from transcriptData
              if ('metadata' in transcriptData) {
                logger.debug('Found metadata field in transcript data, removing it for retry');
                delete transcriptData.metadata;
                logger.debug(`Transcript data keys after removal: ${Object.keys(transcriptData)}`);
                
                // Try insert again without the metadata field
                try {
                  logger.debug('Attempting retry insert without metadata field');
                  const { data: retryData, error: retryError } = await supabase
                    .from('call_transcripts')
                    .insert(transcriptData)
                    .select('id')
                    .single();
                  
                  logger.debug('Retry insert results', { 
                    success: !retryError, 
                    dataReceived: !!retryData,
                    errorMessage: retryError?.message
                  });
                    
                  if (!retryError) {
                    logger.info(`Successfully saved transcript after removing metadata field, ID: ${retryData?.id}`);
                    
                    // Also update the metadata column existence cache
                    this.metadataColumnInfo.exists = false;
                    this.metadataColumnInfo.lastChecked = Date.now();
                    
                    return { id: retryData?.id || transcriptId, error: null };
                  } else {
                    logger.error('Failed retry even after removing metadata field', retryError);
                    return { 
                      id: transcriptId, 
                      error: `Failed to save transcript even after removing metadata: ${retryError.message}` 
                    };
                  }
                } catch (retryException) {
                  logger.error('Exception during metadata-less retry', retryException);
                  return { 
                    id: transcriptId, 
                    error: `Exception during metadata-less retry: ${retryException instanceof Error ? retryException.message : String(retryException)}` 
                  };
                }
              } else {
                logger.warn('Metadata field not found in transcript data object, cannot remove');
              }
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
        
        logger.info('Successfully inserted transcript', { id: data?.id || transcriptId });
        
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
        logger.error('Database exception during transcript insert', dbError);
        return { id: transcriptId, error: dbError };
      }
    } catch (error) {
      logger.error('Error saving transcript', error);
      
      errorHandler.handleError({
        message: 'Failed to save transcript to database',
        technical: error,
        severity: 'error',
        code: 'DB_SAVE_TRANSCRIPT_ERROR'
      }, 'DatabaseService');
      
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
