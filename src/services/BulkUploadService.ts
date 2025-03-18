
import { useBulkUploadStore, UploadStatus } from "@/store/useBulkUploadStore";
import { useWhisperService } from "@/services/WhisperService";
import { toast } from "sonner";
import { useEventsStore } from "@/services/events";
import { BulkUploadProcessorService } from "./BulkUploadProcessorService";
import { debounce } from "lodash";
import { errorHandler } from "./ErrorHandlingService";
import { useCallTranscripts } from "./CallTranscriptService";

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
    if (isProcessing || files.length === 0) {
      console.log('Skipping processQueue: already processing or no files');
      return;
    }
    
    if (!acquireProcessingLock()) {
      console.log('Failed to acquire processing lock, another process is already running');
      toast.info("Upload processing is already in progress");
      return;
    }
    
    console.log(`Starting to process ${files.length} files`);
    
    try {
      setProcessing(true);
      
      dispatchEvent('bulk-upload-started' as any, {
        fileCount: files.filter(f => f.status === 'queued' || f.status === 'processing').length,
        fileIds: files.map(file => file.id)
      });
      
      const queuedFiles = files.filter(file => 
        file.status === 'queued' || 
        (file.status === 'error' && file.progress === 0)
      );
      
      console.log(`Found ${queuedFiles.length} files to process`);
      
      for (let i = 0; i < queuedFiles.length; i++) {
        const file = queuedFiles[i];
        console.log(`Processing file ${i+1}/${queuedFiles.length}: ${file.file.name}`);
        
        try {
          await bulkUploadProcessor.processFile(
            file.file,
            (status, progress, result, error, transcriptId) => {
              updateFileStatus(file.id, status, progress, result, error, transcriptId);
            }
          );
          
          if (i < queuedFiles.length - 1) {
            toast.success(`Processed file ${i+1}/${queuedFiles.length}`, {
              description: file.file.name,
              duration: 3000,
            });
          }
          
          if (i < queuedFiles.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 300));
          }
        } catch (error) {
          console.error(`Error processing file ${file.file.name}:`, error);
          updateFileStatus(file.id, 'error', 0, undefined, 
            error instanceof Error ? error.message : 'Unknown error during processing');
          
          errorHandler.handleError(error, 'BulkUploadService.processFile');
        }
      }
      
      console.log('All files processed, refreshing history and transcript data');
      await debouncedLoadHistory();
      
      await fetchTranscripts({ force: true });
      
      window.dispatchEvent(new CustomEvent('transcriptions-updated'));
      
      dispatchEvent('bulk-upload-completed' as any, {
        fileCount: files.length,
        fileIds: files.map(f => f.id),
        transcriptIds: files.filter(f => f.transcriptId).map(f => f.transcriptId)
      });
      
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
  
  const refreshTranscripts = async (filter?: BulkUploadFilter) => {
    try {
      const transcriptFilter = {
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
