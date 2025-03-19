
import { useEventsStore } from "@/services/events";
import { toast } from "sonner";
import { databaseService } from "./DatabaseService";
import { UploadStatus } from "@/store/useBulkUploadStore";
import { WhisperTranscriptionResponse } from "@/services/WhisperService";
import { throttle } from "lodash";
import { errorHandler } from "./ErrorHandlingService";

export class BulkUploadProcessorService {
  private whisperService: any;
  private assignedUserId: string | null = null;
  private dispatchEvent: (type: string, data?: any) => void;
  private processingFile = false;
  private maxFileSize = 25 * 1024 * 1024; // 25MB limit to prevent memory issues
  private supportedFormats = ['audio/wav', 'audio/mp3', 'audio/mpeg', 'audio/m4a', 'audio/mp4', 'audio/ogg', 'audio/webm'];
  
  constructor(whisperService: any) {
    this.whisperService = whisperService;
    
    // Throttled event dispatch to reduce UI jitter
    this.dispatchEvent = throttle(useEventsStore.getState().dispatchEvent, 300);
  }
  
  // Set the user ID to assign to the uploaded files
  public setAssignedUserId(userId: string | null) {
    console.log('Setting assigned user ID:', userId);
    this.assignedUserId = userId;
  }
  
  // Process a single file with improved error handling and validation
  public async processFile(
    file: File, 
    updateStatus: (status: UploadStatus, progress: number, result?: string, error?: string, transcriptId?: string) => void
  ): Promise<string | null> {
    // If another file is currently being processed, don't allow concurrent processing
    if (this.processingFile) {
      console.log('Another file is already being processed');
      updateStatus('error', 0, undefined, "Another file is currently being processed");
      return null;
    }
    
    // Validate file type
    if (!this.isSupportedFormat(file.type)) {
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
    
    try {
      // Update status to processing and track start time
      updateStatus('processing', 10);
      const startTime = performance.now();
      
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

      const result = await this.whisperService.transcribeAudio(file);

      if (!result) {
        throw new Error("Transcription failed. Please check your API key.");
      }
      
      // Phase 2: Process transcription
      console.log('Processing transcription...');
      updateStatus('processing', 50, result.text, undefined);
      
      // Process and save transcript data
      await this.processTranscriptData(result, file, updateStatus);
      
      // Calculate processing time
      const processingTime = Math.round((performance.now() - startTime) / 1000);
      console.log(`Completed processing ${file.name} in ${processingTime} seconds`);
      
      return null;
    } catch (error) {
      console.error(`Error processing file ${file.name}:`, error);
      updateStatus('error', 100, undefined, error instanceof Error ? error.message : "Processing failed");
      errorHandler.handleError(error, 'BulkUploadProcessorService.processFile');
      return null;
    } finally {
      // Always release the processing lock when done
      this.processingFile = false;
    }
  }
  
  // Check if file format is supported
  private isSupportedFormat(mimeType: string): boolean {
    return this.supportedFormats.includes(mimeType);
  }
  
  // Process transcript data and save to database
  private async processTranscriptData(
    result: WhisperTranscriptionResponse, 
    file: File,
    updateStatus: (status: UploadStatus, progress: number, result?: string, error?: string, transcriptId?: string) => void
  ): Promise<void> {
    try {
      // Update status to indicate database save
      updateStatus('processing', 70, result.text, undefined, undefined);
      
      // Save to database
      const { id, error } = await databaseService.saveTranscriptToDatabase(
        result, 
        file, 
        this.assignedUserId,
        this.whisperService.getNumSpeakers()
      );
      
      if (error) {
        throw new Error(`Failed to save transcript: ${error.message}`);
      }
      
      // Update status to indicate processing trends
      updateStatus('processing', 90, result.text, undefined, id);
      
      // Update trends data - use Promise.allSettled to ensure both operations run
      // even if one of them fails, and we capture any errors
      const [keywordResults, sentimentResults] = await Promise.allSettled([
        databaseService.updateKeywordTrends(result),
        databaseService.updateSentimentTrends(result, this.assignedUserId)
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
      
      // Update status to complete
      updateStatus('complete', 100, result.text, undefined, id);
      
      // Force a refresh of the local storage transcriptions
      this.whisperService.forceRefreshTranscriptions();
      
      // Dispatch event to notify components
      this.dispatchEvent('transcript-created', { 
        id,
        filename: file.name,
        duration: await databaseService.calculateAudioDuration(file)
      });
      
      // Notify using toast - this can cause UI clutter with multiple files
      // so we'll leave it to the parent component to show the completion toast
    } catch (error) {
      errorHandler.handleError(error, 'BulkUploadProcessorService.processTranscriptData');
      throw error;
    }
  }
}
