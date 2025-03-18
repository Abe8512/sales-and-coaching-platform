
import { useBulkUploadStore, UploadStatus } from "@/store/useBulkUploadStore";
import { useWhisperService } from "@/services/WhisperService";
import { toast } from "sonner";
import { useEventsStore } from "@/services/events";
import { BulkUploadProcessorService } from "./BulkUploadProcessorService";
import { debounce } from "lodash";
import { errorHandler } from "./ErrorHandlingService";

// Hook for using bulk upload functionality
export const useBulkUploadService = () => {
  const whisperService = useWhisperService();
  const bulkUploadProcessor = new BulkUploadProcessorService(whisperService);
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
  
  // Set the user ID to assign to the uploaded files
  const setAssignedUserId = (userId: string) => {
    bulkUploadProcessor.setAssignedUserId(userId);
  };
  
  // Debounced version of loadUploadHistory to prevent UI jitter
  const debouncedLoadHistory = debounce(() => {
    loadUploadHistory().catch(error => {
      console.error('Failed to load upload history:', error);
      errorHandler.handleError(error, 'BulkUploadService.loadUploadHistory');
    });
  }, 300);
  
  // Process all files in the queue
  const processQueue = async () => {
    if (isProcessing || files.length === 0) {
      console.log('Skipping processQueue: already processing or no files');
      return;
    }
    
    // Try to acquire processing lock, if it fails, another process is already handling uploads
    if (!acquireProcessingLock()) {
      console.log('Failed to acquire processing lock, another process is already running');
      toast.info("Upload processing is already in progress");
      return;
    }
    
    console.log(`Starting to process ${files.length} files`);
    
    try {
      setProcessing(true);
      
      // Dispatch event that bulk upload processing has started
      dispatchEvent('bulk-upload-started', {
        fileCount: files.filter(f => f.status === 'queued' || f.status === 'processing').length,
        fileIds: files.map(file => file.id)
      });
      
      // Process files one by one to avoid memory issues
      const queuedFiles = files.filter(file => 
        file.status === 'queued' || 
        (file.status === 'error' && file.progress === 0)
      );
      
      console.log(`Found ${queuedFiles.length} files to process`);
      
      // Use for loop instead of forEach to allow proper async/await
      for (let i = 0; i < queuedFiles.length; i++) {
        const file = queuedFiles[i];
        console.log(`Processing file ${i+1}/${queuedFiles.length}: ${file.file.name}`);
        
        try {
          // Process file with progress updates
          await bulkUploadProcessor.processFile(
            file.file,
            (status, progress, result, error, transcriptId) => {
              updateFileStatus(file.id, status, progress, result, error, transcriptId);
            }
          );
          
          // Notify for each successful file
          if (i < queuedFiles.length - 1) {
            toast.success(`Processed file ${i+1}/${queuedFiles.length}`, {
              description: file.file.name,
              duration: 3000,
            });
          }
          
          // Add a small delay between processing files to reduce CPU spikes
          if (i < queuedFiles.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 300));
          }
        } catch (error) {
          console.error(`Error processing file ${file.file.name}:`, error);
          updateFileStatus(file.id, 'error', 0, undefined, 
            error instanceof Error ? error.message : 'Unknown error during processing');
          
          // Continue processing other files even if one fails
          errorHandler.handleError(error, 'BulkUploadService.processFile');
        }
      }
      
      // After processing all files, trigger a reload of the history
      console.log('All files processed, refreshing history');
      await debouncedLoadHistory();
      
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
    } catch (error) {
      console.error('Bulk processing error:', error);
      errorHandler.handleError(error, 'BulkUploadService.processQueue');
      
      toast.error("Processing failed", {
        description: "There was an error processing some files. Please try again.",
      });
    } finally {
      console.log('Finishing bulk upload process, releasing lock');
      setProcessing(false);
      releaseProcessingLock();
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
    releaseProcessingLock
  };
};
