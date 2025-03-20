import { useBulkUploadStore, UploadStatus } from "@/store/useBulkUploadStore";
import { useWhisperService } from "@/services/WhisperService";
import { toast } from "sonner";
import { useEventsStore } from "@/services/events";
import { BulkUploadProcessorService } from "./BulkUploadProcessorService";
import { debounce } from "lodash";
import { errorHandler } from "@/services/ErrorHandlingService";
import { useCallTranscripts, CallTranscriptFilter } from "./CallTranscriptService";

export interface BulkUploadFilter {
  force?: boolean;
}

export const useBulkUploadService = () => {
  const whisperService = useWhisperService();
  const bulkUploadProcessor = new BulkUploadProcessorService(whisperService);
  const { fetchTranscripts } = useCallTranscripts();
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
    hasLoadedHistory,
    acquireProcessingLock,
    releaseProcessingLock
  } = useBulkUploadStore();
  const dispatchEvent = useEventsStore.getState().dispatchEvent;
  
  const setAssignedUserId = (userId: string) => {
    bulkUploadProcessor.setAssignedUserId(userId);
  };
  
  const debouncedLoadHistory = debounce(() => {
    loadUploadHistory().catch(error => {
      console.error('Failed to load upload history:', error);
      errorHandler.handleError(error, 'BulkUploadService.loadUploadHistory');
    });
  }, 300);
  
  const processQueue = async () => {
    // Debug info about current state
    console.log('processQueue called with state:', { 
      isProcessing, 
      filesCount: files.length,
      filesStatuses: files.map(f => f.status),
      filesUserIds: files.map(f => f.userId),
      connectionStatus: errorHandler.isOffline ? 'offline' : 'online'
    });
    
    if (files.length === 0) {
      console.log('No files to process in queue');
      toast.info("No files to process", {
        description: "Please add audio files first"
      });
      return;
    }
    
    if (isProcessing) {
      console.log('Already processing files');
      toast.info("Already processing", {
        description: "Please wait until current processing completes"
      });
      return;
    }
    
    // Check for database connection before processing
    if (errorHandler.isOffline) {
      console.log('Cannot process files: Database connection is offline');
      toast.error("Cannot process files", {
        description: "Database connection is offline. Please check your connection and try again."
      });
      return;
    }
    
    // Check for the OpenAI API key if not using local Whisper
    const useLocalWhisper = bulkUploadProcessor.isUsingLocalWhisper();
    const apiKey = localStorage.getItem("openai_api_key");
    
    if (!useLocalWhisper && !apiKey) {
      console.log('Cannot process files: OpenAI API key missing');
      toast.error("API Key Required", {
        description: "Please add your OpenAI API key in Settings or enable local Whisper"
      });
      return;
    }
    
    // Check for processing lock
    if (!acquireProcessingLock()) {
      console.log('Failed to acquire processing lock, another process is already running');
      toast.info("Upload processing is already in progress");
      return;
    }
    
    try {
      setProcessing(true);
      
      // Show toast to indicate processing started
      toast.info("Processing started", {
        description: `Processing ${files.length} file(s)`,
        duration: 3000,
      });
      
      dispatchEvent('bulk-upload-started', {
        fileCount: files.filter(f => f.status === 'queued' || f.status === 'processing').length,
        fileIds: files.map(file => file.id)
      });
      
      // Identify which files need processing - include both queued files and error files with 0 progress
      const queuedFiles = files.filter(file => 
        file.status === 'queued' || 
        (file.status === 'error' && file.progress === 0)
      );
      
      console.log(`Found ${queuedFiles.length} files to process out of ${files.length} total`);
      console.log('Files to process:', queuedFiles.map(f => ({ 
        id: f.id, 
        name: f.file.name, 
        status: f.status,
        userId: f.userId,
        fileType: f.file.type
      })));
      
      if (queuedFiles.length === 0) {
        console.log('No files to process. File statuses:', files.map(f => f.status));
        toast.info("No new files to process", {
          description: "All files have been processed already or are currently processing"
        });
        setProcessing(false);
        releaseProcessingLock();
        return;
      }
      
      let successCount = 0;
      let errorCount = 0;
      
      // Process files one by one
      for (let i = 0; i < queuedFiles.length; i++) {
        const file = queuedFiles[i];
        console.log(`Processing file ${i+1}/${queuedFiles.length}: ${file.file.name}, type: ${file.file.type}, size: ${file.file.size}, userId: ${file.userId}`);
        
        // Check if we should abort processing (e.g., if connection was lost)
        if (errorHandler.isOffline) {
          console.log('Connection lost during processing. Stopping queue.');
          toast.error("Processing stopped", {
            description: "Connection lost. Please check your connection and try again."
          });
          break;
        }
        
        // Ensure the processor has the user ID set
        if (file.userId) {
          bulkUploadProcessor.setAssignedUserId(file.userId);
          console.log(`Set processor user ID to: ${file.userId}`);
        } else {
          console.warn(`File ${file.id} has no userId`);
        }
        
        // Mark this file as processing immediately to provide visual feedback
        updateFileStatus(file.id, 'processing', 10, 'Starting transcription...');
        
        // Update status for any waiting files
        for (let j = i + 1; j < queuedFiles.length; j++) {
          updateFileStatus(queuedFiles[j].id, 'queued', 0);
        }
        
        try {
          console.log(`Starting processFile for ${file.file.name}`);
          
          // Show toast for each file processing
          toast.loading(`Processing file ${i+1}/${queuedFiles.length}`, {
            description: file.file.name,
            duration: 3000,
          });
          
          const result = await bulkUploadProcessor.processFile(
            file.file,
            (status, progress, result, error, transcriptId) => {
              console.log(`File ${file.id} status update: ${status}, progress: ${progress}%`);
              updateFileStatus(file.id, status, progress, result, error, transcriptId);
            }
          );
          
          console.log(`Completed processFile for ${file.file.name}, result:`, result);
          
          // Check the final status of the file after processing
          const processedFile = files.find(f => f.id === file.id);
          if (processedFile?.status === 'complete') {
            successCount++;
          } else if (processedFile?.status === 'error') {
            errorCount++;
          }
          
          if (i < queuedFiles.length - 1) {
            toast.success(`Processed file ${i+1}/${queuedFiles.length}`, {
              description: file.file.name,
              duration: 3000,
            });
          }
        } catch (error) {
          console.error(`Error processing file ${file.file.name}:`, error);
          errorCount++;
          
          // Show error toast for failed file
          toast.error(`Failed to process ${file.file.name}`, {
            description: error instanceof Error ? error.message : 'Unknown error',
            duration: 5000,
          });
          
          // Update file status to error if not already set
          updateFileStatus(file.id, 'error', 0, undefined, 
            error instanceof Error ? error.message : 'Unknown error');
          
          // Only stop the whole queue for critical errors like auth issues
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          const isCriticalError = errorMsg.includes('API key') || 
                                 errorMsg.includes('authentication') || 
                                 errorMsg.includes('401');
          
          if (isCriticalError) {
            console.log('Critical error encountered. Stopping queue processing.');
            break;
          }
          
          // Continue with next file for non-critical errors
          continue;
        }
      }
      
      // Show completion toast
      if (successCount > 0 && errorCount === 0) {
        toast.success(`Processing completed`, {
          description: `Successfully processed ${successCount} file(s)`,
          duration: 3000,
        });
      } else if (successCount > 0 && errorCount > 0) {
        toast.info(`Processing completed with some errors`, {
          description: `Processed ${successCount} file(s), ${errorCount} failed`,
          duration: 5000,
        });
      } else if (successCount === 0 && errorCount > 0) {
        toast.error(`Processing failed`, {
          description: `All ${errorCount} file(s) failed to process`,
          duration: 5000,
        });
      }
      
      // Get the actual success count from the processor service
      const actualSuccessCount = bulkUploadProcessor.getSuccessCount();
      console.log(`Processor service reports ${actualSuccessCount} successful uploads`);
      
      // Trigger events to update UI
      dispatchEvent('bulk-upload-completed', {
        fileCount: queuedFiles.length,
        successCount: actualSuccessCount
      });
      
      // Load history if there were any successfully processed files
      if (actualSuccessCount > 0) {
        console.log('Loading upload history after successful processing');
        await loadUploadHistory();
      }
      
      // Reset the success counter for the next batch
      bulkUploadProcessor.resetSuccessCount();
      
    } catch (error) {
      console.error('Error in processQueue:', error);
      
      toast.error("Processing Error", {
        description: error instanceof Error ? error.message : "Unknown error occurred while processing files",
        duration: 5000,
      });
      
      errorHandler.handleError(error, 'BulkUploadService.processQueue');
    } finally {
      console.log('Finishing processing queue, releasing lock');
      setProcessing(false);
      releaseProcessingLock();
    }
  };
  
  const refreshTranscripts = async (filter?: BulkUploadFilter) => {
    try {
      const transcriptFilter: CallTranscriptFilter = {
        force: filter?.force || false
      };
      
      await fetchTranscripts(transcriptFilter);
    } catch (error) {
      console.error('Failed to refresh transcripts:', error);
      errorHandler.handleError(error, 'BulkUploadService.refreshTranscripts');
    }
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
    loadUploadHistory: debouncedLoadHistory,
    setAssignedUserId,
    acquireProcessingLock,
    releaseProcessingLock,
    refreshTranscripts
  };
};
