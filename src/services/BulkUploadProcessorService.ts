
import { useEventsStore } from "@/services/events";
import { toast } from "sonner";
import { databaseService } from "./DatabaseService";
import { UploadStatus } from "@/store/useBulkUploadStore";
import { WhisperTranscriptionResponse } from "@/services/WhisperService";
import { throttle } from "lodash";

export class BulkUploadProcessorService {
  private whisperService: any;
  private assignedUserId: string | null = null;
  private dispatchEvent: (type: string, data?: any) => void;
  private processingFile = false;
  
  constructor(whisperService: any) {
    this.whisperService = whisperService;
    this.dispatchEvent = useEventsStore.getState().dispatchEvent;
    
    // Throttled event dispatch to reduce UI jitter
    this.dispatchEvent = throttle(useEventsStore.getState().dispatchEvent, 300);
  }
  
  // Set the user ID to assign to the uploaded files
  public setAssignedUserId(userId: string | null) {
    console.log('Setting assigned user ID:', userId);
    this.assignedUserId = userId;
  }
  
  // Process a single file
  public async processFile(
    file: File, 
    updateStatus: (status: UploadStatus, progress: number, result?: string, error?: string, transcriptId?: string) => void
  ): Promise<string | null> {
    // Prevent concurrent processing of the same file
    if (this.processingFile) {
      updateStatus('error', 0, undefined, "Another file is currently being processed");
      return null;
    }
    
    this.processingFile = true;
    
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
      
      // Process and save transcript data
      await this.processTranscriptData(result, file, updateStatus);
      
      return null;
    } catch (error) {
      console.error(`Error processing file ${file.name}:`, error);
      updateStatus('error', 100, undefined, error instanceof Error ? error.message : "Processing failed");
      return null;
    } finally {
      this.processingFile = false;
    }
  }
  
  // Process transcript data and save to database
  private async processTranscriptData(
    result: WhisperTranscriptionResponse, 
    file: File,
    updateStatus: (status: UploadStatus, progress: number, result?: string, error?: string, transcriptId?: string) => void
  ): Promise<void> {
    try {
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
      
      // Update trends data - do this in the background to avoid blocking UI
      Promise.all([
        databaseService.updateKeywordTrends(result),
        databaseService.updateSentimentTrends(result, this.assignedUserId)
      ]).catch(err => {
        console.error("Error updating trends:", err);
      });
      
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
      
      // Notify using toast
      toast.success("File processed successfully", {
        description: "Transcript and metrics have been updated with this call data."
      });
    } catch (error) {
      throw error;
    }
  }
}
