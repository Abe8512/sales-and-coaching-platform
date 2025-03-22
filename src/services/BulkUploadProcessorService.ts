import { useEventsStore } from "@/services/events";
import { toast } from "sonner";
import { databaseService } from "./DatabaseService";
import { UploadStatus } from "@/store/useBulkUploadStore";
import { WhisperTranscriptionResponse } from "@/services/WhisperService";
import { throttle } from "lodash";
import { errorHandler } from "./ErrorHandlingService";
import { v4 as uuidv4 } from 'uuid';

// Define type for WhisperService with required methods
interface WhisperServiceType {
  transcribeAudio: (file: File) => Promise<WhisperTranscriptionResponse | null>;
  getUseLocalWhisper: () => boolean;
  getNumSpeakers: () => number;
  forceRefreshTranscriptions: () => void;
}

export class BulkUploadProcessorService {
  private whisperService: WhisperServiceType;
  private assignedUserId: string | null = null;
  private dispatchEvent: (type: string, data?: Record<string, unknown>) => void;
  private processingFile = false;
  private maxFileSize = 25 * 1024 * 1024; // 25MB limit to prevent memory issues
  private supportedFormats = ['audio/wav', 'audio/mp3', 'audio/mpeg', 'audio/m4a', 'audio/mp4', 'audio/ogg', 'audio/webm'];
  private rejectedMimeTypes = ['text/plain', 'text/csv', 'text/html', 'text/javascript', 'application/json', 'text/xml', 'application/xml'];
  private successCount = 0;
  
  constructor(whisperService: WhisperServiceType) {
    this.whisperService = whisperService;
    
    // Throttled event dispatch to reduce UI jitter
    this.dispatchEvent = throttle(useEventsStore.getState().dispatchEvent, 300);
  }
  
  // Set the user ID to assign to the uploaded files
  public setAssignedUserId(userId: string | null) {
    console.log('Setting assigned user ID:', userId);
    this.assignedUserId = userId;
  }
  
  // Public method to check if local Whisper is being used
  public isUsingLocalWhisper(): boolean {
    return this.whisperService.getUseLocalWhisper();
  }
  
  // Process a single file with improved error handling and validation
  public async processFile(
    file: File, 
    updateStatus: (status: UploadStatus, progress: number, result?: string, error?: string, transcriptId?: string) => void
  ): Promise<string | null> {
    console.log(`BulkUploadProcessorService.processFile called with file:`, {
      name: file.name,
      type: file.type,
      size: file.size,
      extension: file.name.split('.').pop()?.toLowerCase()
    });
    
    // If another file is currently being processed, don't allow concurrent processing
    if (this.processingFile) {
      console.log('Another file is already being processed');
      updateStatus('error', 0, undefined, "Another file is currently being processed");
      return null;
    }
    
    // Validate file type using the enhanced check that looks at extensions too
    const isValidFile = this.isAudioFile(file);
    console.log(`File validation result for ${file.name}: ${isValidFile ? 'valid' : 'invalid'}`);
    
    if (!isValidFile) {
      console.log(`Unsupported file format: ${file.type}`);
      updateStatus('error', 0, undefined, `Unsupported file format: ${file.type}. Please upload audio files only.`);
      return null;
    }
    
    // Check file size
    if (file.size > this.maxFileSize) {
      console.log(`File too large: ${file.size} bytes (max: ${this.maxFileSize} bytes)`);
      updateStatus('error', 0, undefined, `File too large. Maximum size is ${Math.round(this.maxFileSize/1024/1024)}MB`);
      return null;
    }
    
    // Acquire processing lock
    this.processingFile = true;
    console.log(`Starting to process file: ${file.name} (${Math.round(file.size/1024)}KB)`);
    
    // Set up status update intervals to show continuous progress
    let statusUpdateInterval: number | null = null;
    let currentProgress = 10;
    const maxInitialProgress = 65; // Cap progress at this point until actual transcription completes
    
    try {
      // Update status to processing and track start time
      updateStatus('processing', currentProgress);
      const startTime = performance.now();
      
      // Set up a progress interval to show the user something is happening
      statusUpdateInterval = window.setInterval(() => {
        // Only advance progress by small increments to show activity
        if (currentProgress < maxInitialProgress) {
          currentProgress += 1;
          updateStatus('processing', currentProgress, 'Transcribing audio...');
        }
      }, 2000) as unknown as number;
      
      this.dispatchEvent('bulk-upload-started', { 
        filename: file.name, 
        size: file.size
      });
      
      // Phase 1: Transcribe the audio file
      console.log('Transcribing audio...');
      updateStatus('processing', 20, 'Transcribing audio...');
      
      // Check if we're using local Whisper or API
      const useLocalWhisper = this.whisperService.getUseLocalWhisper();
      console.log(`Using ${useLocalWhisper ? 'local' : 'API'} Whisper for transcription`);

      try {
        // Call the transcribeAudio method which now has its own retry logic
        console.log(`Calling transcribeAudio for file ${file.name}`);
      const result = await this.whisperService.transcribeAudio(file);
        
        console.log(`Transcription result for ${file.name}:`, result ? 'success' : 'failed');

      if (!result) {
          throw new Error("Transcription failed to return a result.");
        }
        
        // Clear the progress interval as we now have actual results
        if (statusUpdateInterval) {
          clearInterval(statusUpdateInterval);
          statusUpdateInterval = null;
      }
      
      // Phase 2: Process transcription
      console.log('Processing transcription...');
        updateStatus('processing', 70, result.text, undefined);
      
      // Process and save transcript data
      await this.processTranscriptData(result, file, updateStatus);
      
      // Calculate processing time
      const processingTime = Math.round((performance.now() - startTime) / 1000);
      console.log(`Completed processing ${file.name} in ${processingTime} seconds`);
        
        // If we got here, the process was successful
        this.successCount++;
      
      return null;
      } catch (transcriptionError) {
        console.error(`Transcription error for ${file.name}:`, transcriptionError);
        
        // Clear the progress interval
        if (statusUpdateInterval) {
          clearInterval(statusUpdateInterval);
          statusUpdateInterval = null;
        }
        
        let errorMessage = "Transcription failed.";
        if (transcriptionError instanceof Error) {
          errorMessage = transcriptionError.message;
        }
        
        // Add more context based on the error type
        if (errorMessage.includes('API key')) {
          errorMessage = "Authentication error: " + errorMessage;
        } else if (errorMessage.includes('limit') || errorMessage.includes('429')) {
          errorMessage = "Rate limit exceeded: " + errorMessage + " Please try again in a moment.";
        } else if (errorMessage.includes('format') || errorMessage.includes('invalid')) {
          errorMessage = "File format error: " + errorMessage;
        }
        
        if (useLocalWhisper) {
          errorMessage += " Please try again or switch to OpenAI API mode.";
        } else {
          errorMessage += " Please check your OpenAI API key.";
        }
        
        updateStatus('error', 0, undefined, errorMessage);
        throw transcriptionError;
      }
    } catch (error) {
      console.error(`Error processing file ${file.name}:`, error);
      
      // Clear any remaining intervals
      if (statusUpdateInterval) {
        clearInterval(statusUpdateInterval);
      }
      
      // Check if it's an authentication error
      let errorMessage = error instanceof Error ? error.message : "Processing failed";
      
      if (errorMessage.includes('API key') || 
          errorMessage.includes('authentication') || 
          errorMessage.includes('401')) {
        errorMessage = "Authentication error: Please check your API key settings.";
      } else if (errorMessage.includes('CORS') || errorMessage.includes('origin')) {
        errorMessage = "Network error: CORS issue detected. Please check your connection.";
      } else if (errorMessage.includes('limit') || errorMessage.includes('429')) {
        errorMessage = "Rate limit exceeded. Please try again later.";
      } else if (errorMessage.includes('offline') || errorMessage.includes('network')) {
        errorMessage = "Network error: You appear to be offline. Please check your connection.";
      }
      
      updateStatus('error', 0, undefined, errorMessage);
      return null;
    } finally {
      // Always release the processing lock
      this.processingFile = false;
    }
  }
  
  // Check if file format is supported
  private isSupportedFormat(mimeType: string): boolean {
    console.log(`Checking if mime type is supported: ${mimeType}`);
    
    // First explicitly reject text-based content types
    if (this.rejectedMimeTypes.some(type => mimeType.includes(type))) {
      console.log(`Mime type ${mimeType} is explicitly rejected as text-based content`);
      return false;
    }
    
    // Check against supported formats list first
    if (this.supportedFormats.includes(mimeType)) {
      console.log(`Mime type ${mimeType} is in supported formats list`);
      return true;
    }
    
    // Some browsers or systems might return generic mime types
    if (mimeType === 'audio/octet-stream' || mimeType === 'application/octet-stream') {
      console.log(`Mime type ${mimeType} is a generic binary format, allowing`);
      return true; // Allow generic audio/binary formats, we'll try to process them
    }
    
    console.log(`Mime type ${mimeType} is not supported`);
    return false;
  }
  
  // Handle file name checking for file extension
  public isAudioFile(file: File): boolean {
    console.log(`Checking if file is audio: ${file.name}, type: ${file.type}`);
    
    // First check if this is a text file by MIME type - explicitly reject
    if (this.rejectedMimeTypes.some(type => file.type.includes(type))) {
      console.log(`Rejecting text file with MIME type: ${file.type}`);
      return false;
    }
    
    // Check MIME type against supported formats
    if (this.isSupportedFormat(file.type)) {
      console.log(`File ${file.name} has supported MIME type: ${file.type}`);
      return true;
    }
    
    // If MIME type check fails, check file extension
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    console.log(`File extension check for ${file.name}: ${fileExtension}`);
    
    // Explicitly reject text file extensions
    const rejectedExtensions = ['txt', 'json', 'csv', 'xml', 'html', 'js', 'jsx', 'ts', 'tsx'];
    if (!fileExtension || rejectedExtensions.includes(fileExtension)) {
      console.log(`File extension ${fileExtension || 'none'} is rejected for audio processing`);
      return false;
    }
    
    // Only include actual audio extensions
    const supportedExtensions = ['wav', 'mp3', 'mp4', 'm4a', 'ogg', 'webm'];
    
    const extensionResult = supportedExtensions.includes(fileExtension || '');
    console.log(`File extension check for ${file.name}: ${fileExtension} - ${extensionResult ? 'supported' : 'not supported'}`);
    
    return extensionResult;
  }
  
  // Helper method to validate transcription result
  private validateTranscriptionResult(result: WhisperTranscriptionResponse): WhisperTranscriptionResponse {
    // Verify that the result has the expected format and properties
    if (!result || !result.text) {
      console.error('Invalid transcription result:', result);
      throw new Error('Invalid transcription result: missing required data');
    }
    
    // Ensure proper typing for the transcription result
    return {
      id: result.id || uuidv4(),
      text: result.text,
      segments: result.segments || [],
      language: result.language || 'en',
      duration: result.duration || 0
    };
  }
  
  /**
   * Process the transcript data by validating, enriching, and saving to the database
   */
  private async processTranscriptData(
    result: WhisperTranscriptionResponse, 
    file: File,
    updateStatus: (status: UploadStatus, progress: number, result?: string, error?: string, transcriptId?: string) => void
  ): Promise<void> {
    try {
      console.log(`[PROCESSOR_DEBUG] Starting to process transcript data for ${file.name}`);
      updateStatus('processing', 75, undefined, 'Saving transcript...');
      
      // Create a copy of the file to avoid modifying the original
      const fileToProcess = new File([file], file.name, { type: file.type });
      
      // Validate the result
      const validatedResult = this.validateTranscriptionResult(result);
      if (!validatedResult) {
        console.error(`[PROCESSOR_DEBUG] Invalid transcription result for ${file.name}`, result);
        updateStatus('error', 0, undefined, 'Invalid transcription result');
        return;
      }
      
      // Add a retry with a different approach if we get content-type errors
      try {
        console.log(`[PROCESSOR_DEBUG] Attempting to save transcript for ${file.name} to database`);
        // Check connection status before attempting to save
        console.log(`[PROCESSOR_DEBUG] Connection status before save: ${errorHandler.isOffline ? 'offline' : 'online'}`);
        
        // First attempt - try to save as-is
        const saveResult = await databaseService.saveTranscriptToDatabase(
          validatedResult, 
          fileToProcess,
          this.assignedUserId,
          this.whisperService.getNumSpeakers()
        );
          
        // Check for errors
        let transcriptId = saveResult.id;
        const error = saveResult.error;
        
        if (error) {
          // Format error message for better error handling
          const errorMessage = typeof error === 'object' && error !== null
            ? (error as Error).message || error.toString() 
            : String(error || 'Unknown database error');
          
          console.error(`[PROCESSOR_DEBUG] Database save error for ${file.name}: ${errorMessage}`);
          
          // Log detailed error information
          console.error(`Database save error for ${file.name}:`, {
            error,
            errorMessage,
            fileType: fileToProcess.type,
            fileName: fileToProcess.name,
            resultSnippet: validatedResult.text.substring(0, 100) + '...'
          });
          
          // Check if this is an offline error
          if (errorMessage.includes('offline') || errorMessage.includes('network') || errorHandler.isOffline) {
            console.log(`[PROCESSOR_DEBUG] Offline error detected for ${file.name}`);
            
            // Add to offline queue instead of failing immediately
            try {
              console.log(`[PROCESSOR_DEBUG] Adding save operation to offline queue for ${file.name}`);
              
              // Create a copy of the validatedResult to avoid reference issues
              const offlineData = { 
                file: fileToProcess,
                result: JSON.parse(JSON.stringify(validatedResult)),
                userId: this.assignedUserId,
                timestamp: Date.now()
              };
              
              // Store in localStorage for recovery on reconnection
              const pendingUploads = JSON.parse(localStorage.getItem('pendingUploads') || '[]');
              pendingUploads.push({
                id: `${Date.now()}-${file.name}`,
                data: offlineData,
                retryCount: 0
              });
              localStorage.setItem('pendingUploads', JSON.stringify(pendingUploads));
              
              console.log(`[PROCESSOR_DEBUG] Saved to pending uploads queue. Current queue size: ${pendingUploads.length}`);
              
              // Update status to reflect offline state but with a more helpful message
              updateStatus('queued', 0, undefined, `Network error: Your upload has been queued and will resume when connection is restored.`);
              
              // Track the error but continue processing other files
              errorHandler.handleError(new Error(`Failed to save transcript, queued for retry: ${errorMessage}`), 'BulkUploadProcessorService.processTranscriptData');
              
              // Don't throw, instead return normally to allow processing to continue
              return;
            } catch (queueError) {
              console.error(`[PROCESSOR_DEBUG] Failed to queue upload for offline processing: ${queueError instanceof Error ? queueError.message : String(queueError)}`);
              
              // If queuing fails, fall back to the standard error
              updateStatus('error', 0, undefined, `Network error: You appear to be offline. Please check your connection.`);
              
              // Rethrow to be handled by caller
              throw new Error(`Failed to save transcript: ${errorMessage}`);
            }
          } else {
            throw new Error(`Failed to save transcript: ${errorMessage}`);
          }
        }
        
        console.log(`[PROCESSOR_DEBUG] Successfully saved transcript to database with ID: ${transcriptId}`);
      
      // Update status to indicate processing trends
        updateStatus('processing', 90, validatedResult.text, undefined, transcriptId);
      
      // Update trends data - use Promise.allSettled to ensure both operations run
      // even if one of them fails, and we capture any errors
      const [keywordResults, sentimentResults] = await Promise.allSettled([
          databaseService.updateKeywordTrends(validatedResult),
          databaseService.updateSentimentTrends(validatedResult, this.assignedUserId)
      ]);

      // Log any errors in the background processes
      if (keywordResults.status === 'rejected') {
        console.error("Error updating keyword trends:", keywordResults.reason);
        errorHandler.handleError(keywordResults.reason, 'BulkUploadProcessorService.updateKeywordTrends');
      }

      if (sentimentResults.status === 'rejected') {
        console.error("Error updating sentiment trends:", sentimentResults.reason);
        errorHandler.handleError(sentimentResults.reason, 'BulkUploadProcessorService.updateSentimentTrends');
      }
      
        // Set final status as complete
        updateStatus('complete', 100, validatedResult.text, undefined, transcriptId);
      
      // Force a refresh of the local storage transcriptions
      this.whisperService.forceRefreshTranscriptions();
      
      // Dispatch event to notify components
      this.dispatchEvent('transcript-created', { 
          id: transcriptId,
        filename: file.name,
        duration: await databaseService.calculateAudioDuration(file)
      });
      
        return;
      } catch (dbError) {
        // Improve error tracking for database-specific issues
        console.error(`Database operation failed for ${file.name}:`, dbError);
        throw dbError; // Re-throw to be caught by outer try-catch
      }
    } catch (error) {
      // Enhanced error handling with more detailed logging
      let errorMessage = error instanceof Error ? error.message : String(error || 'Unknown error');
      
      // Look for specific metadata column error
      if (errorMessage.includes('metadata') && errorMessage.includes('column') && errorMessage.includes('does not exist')) {
        // For metadata column errors, try to save again with explicit handling
        if (!errorMessage.includes('retry_attempted')) {
          console.log(`[DEBUG] Detected metadata column error for ${file.name}. Full error message:`, errorMessage);
          console.log(`[DEBUG] Attempting retry with metadata field excluded.`);
          
          try {
            // Wait a bit to avoid potential race conditions
            console.log(`[DEBUG] Waiting 1 second before retry`);
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Clone the result object to avoid modifying the original
            const retryResult = { ...result };
            console.log(`[DEBUG] Created retry result object with keys:`, Object.keys(retryResult));
            
            // Check the structure of the retryResult object
            console.log(`[DEBUG] Retry result structure:`, {
              hasText: !!retryResult.text,
              textLength: retryResult.text?.length || 0,
              hasSegments: Array.isArray(retryResult.segments),
              segmentsCount: Array.isArray(retryResult.segments) ? retryResult.segments.length : 0,
              hasId: !!retryResult.id,
              id: retryResult.id
            });
            
            // Make another attempt to save the transcript but mark that we've already attempted a retry
            // to avoid infinite loops if something else is wrong
            console.log(`[DEBUG] Calling databaseService.saveTranscriptToDatabase with retry attempt`);
            const saveResult = await databaseService.saveTranscriptToDatabase(
              retryResult, 
              file,
              this.assignedUserId,
              this.whisperService.getNumSpeakers()
            );
            
            console.log(`[DEBUG] Save result from retry:`, { 
              success: !saveResult.error,
              id: saveResult.id,
              errorMessage: saveResult.error ? (typeof saveResult.error === 'string' ? saveResult.error : saveResult.error.message) : null
            });
            
            if (!saveResult.error) {
              // Success on retry!
              console.log(`[DEBUG] Successfully saved transcript on retry with ID: ${saveResult.id}`);
              
              // Set final status as complete
              updateStatus('complete', 100, result.text, undefined, saveResult.id);
              console.log(`[DEBUG] Updated status to complete for file ${file.name}`);
              
              // Force a refresh of the local storage transcriptions
              this.whisperService.forceRefreshTranscriptions();
              console.log(`[DEBUG] Refreshed local transcriptions`);
              
              // Dispatch event to notify components
              this.dispatchEvent('transcript-created', { 
                id: saveResult.id,
                filename: file.name,
                duration: await databaseService.calculateAudioDuration(file)
              });
              console.log(`[DEBUG] Dispatched transcript-created event for file ${file.name}`);
              
              return;
            } else {
              // Still failed, use a more specific error message
              console.log(`[DEBUG] Retry still failed with error:`, saveResult.error);
              errorMessage = `Metadata column error: Even after retry, couldn't save transcript due to schema issues. Error: ${saveResult.error}`;
            }
          } catch (retryError) {
            // If the retry also fails, update the error message
            console.error(`[DEBUG] Exception during retry save for ${file.name}:`, retryError);
            const errorDetails = retryError instanceof Error 
              ? { message: retryError.message, stack: retryError.stack }
              : String(retryError);
            console.error(`[DEBUG] Error details:`, errorDetails);
            errorMessage = `Metadata column error: Attempted to retry saving without metadata, but still failed: ${retryError instanceof Error ? retryError.message : String(retryError)}`;
          }
        } else {
          console.log(`[DEBUG] Already attempted a retry for this error, not retrying again`);
          errorMessage = "Database schema issue: The metadata column doesn't exist. Please go to the Admin page (/admin) to fix this issue, or contact your administrator.";
        }
        
        console.error(`[DEBUG] Metadata column missing error for ${file.name}. Using friendly message: ${errorMessage}`);
      } else {
        console.error(`Error processing transcript data for ${file.name}:`, {
          error,
          errorMessage,
          fileType: file.type,
          fileName: file.name
        });
      }
      
      // Update status with error
      updateStatus('error', 0, undefined, errorMessage);
      
      // Rethrow to be handled by caller
      throw new Error(errorMessage);
    }
  }

  // In the processQueue method where the final event is dispatched
  // Add logic to track successful file uploads
  private dispatchEvents(successCount: number, fileCount: number) {
    // Dispatch event to notify components 
    this.dispatchEvent('bulk-upload-completed', { 
      fileCount, 
      successCount,
      timestamp: Date.now()
    });
  }

  // Get the success count and reset it
  public getSuccessCount(): number {
    const count = this.successCount;
    return count;
  }
  
  // Reset the success counter
  public resetSuccessCount(): void {
    this.successCount = 0;
  }
}
