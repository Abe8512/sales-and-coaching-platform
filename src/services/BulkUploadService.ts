
import { useBulkUploadStore, UploadStatus } from "@/store/useBulkUploadStore";
import { useWhisperService } from "@/services/WhisperService";
import { toast } from "sonner";
import { useEventsStore } from "@/services/events";
import { BulkUploadProcessorService } from "./BulkUploadProcessorService";
import { debounce } from "lodash";

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
    loadUploadHistory();
  }, 300);
  
  // Process all files in the queue
  const processQueue = async () => {
    if (isProcessing || files.length === 0) return;
    
    // Try to acquire processing lock, if it fails, another process is already handling uploads
    if (!acquireProcessingLock()) {
      toast.info("Upload processing is already in progress");
      return;
    }
    
    try {
      setProcessing(true);
      
      // Dispatch event that bulk upload processing has started
      dispatchEvent('bulk-upload-started', {
        fileCount: files.filter(f => f.status === 'queued' || f.status === 'processing').length,
        fileIds: files.map(file => file.id)
      });
      
      // Process files sequentially with a small delay between each
      for (const file of files) {
        // Skip already processed files
        if (file.status === 'complete' || file.status === 'error') continue;
        
        await bulkUploadProcessor.processFile(
          file.file,
          (status, progress, result, error, transcriptId) => {
            updateFileStatus(file.id, status, progress, result, error, transcriptId);
          }
        );
        
        // Add a small delay between processing files to reduce CPU spikes
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      // After processing all files, trigger a reload of the history using debounced function
      debouncedLoadHistory();
      
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
    } finally {
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
