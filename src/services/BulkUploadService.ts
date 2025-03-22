import { useBulkUploadStore, UploadStatus } from "@/store/useBulkUploadStore";
import { useWhisperService } from "@/services/WhisperService";
import { toast } from "sonner";
import { useEventsStore } from "@/services/events";
import { BulkUploadProcessorService } from "./BulkUploadProcessorService";
import { debounce } from "lodash";
import { errorHandler } from "@/services/ErrorHandlingService";
import { useCallTranscripts, CallTranscriptFilter } from "./CallTranscriptService";
import { useEffect } from "react";
import { v4 as uuidv4 } from "uuid";

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
  
  const setAssignedUserId = (userId: string | null) => {
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
    
    // Check connection status but provide more nuanced error messages
    const isBrowserOffline = typeof navigator !== 'undefined' && !navigator.onLine;
    
    console.log(`[BULK_UPLOAD_DEBUG] Connection status check: Browser reports ${isBrowserOffline ? 'offline' : 'online'}, errorHandler reports ${errorHandler.isOffline ? 'offline' : 'online'}`);
    
    // First check if the browser itself reports being offline
    if (isBrowserOffline) {
      console.log('Browser reports device is offline');
      toast.error("Cannot process files", {
        description: "Your device appears to be offline. Please check your network connection and try again."
      });
      return;
    }
    
    // If errorHandler reports offline but browser is online, it's likely a database connection issue
    if (errorHandler.isOffline && !isBrowserOffline) {
      console.log('Database connection is unavailable, but device is online');
      
      // Check if it's a schema issue by trying a direct connection check
      try {
        console.log(`[BULK_UPLOAD_DEBUG] Performing manual connection check to ${import.meta.env.VITE_SUPABASE_URL}/rest/v1/`);
        
        const isServerReachable = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/`, {
          method: 'HEAD',
          headers: {
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
          }
        }).then(response => {
          console.log(`[BULK_UPLOAD_DEBUG] Manual connection check response: status=${response.status}`);
          return response.status < 500;
        });
        
        if (isServerReachable) {
          console.log('Server is reachable but app reports offline - likely schema issues');
          toast.warning("Database Configuration Issue", {
            description: "Database is reachable but may have schema issues. Files will be processed but may not save permanently.",
          });
          // Continue processing despite the issue - data will be stored in memory
        } else {
          console.log('Server is not reachable');
          toast.error("Cannot connect to database", {
            description: "Cannot reach the database server. Please check your connection and try again."
          });
          return;
        }
      } catch (checkError) {
        console.error('[BULK_UPLOAD_DEBUG] Error checking server reachability:', checkError);
        toast.error("Connection check failed", {
          description: "Cannot verify database connection. Files will process but may not save properly."
        });
        // Continue with caution
      }
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
          console.log('[BULK_UPLOAD_DEBUG] Connection lost during processing. Stopping queue.');
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
          console.log(`[BULK_UPLOAD_DEBUG] Starting transcription of ${file.file.name}, connection status: ${errorHandler.isOffline ? 'offline' : 'online'}`);
          // Process file through the processor service
          updateFileStatus(file.id, 'processing', 15, 'Transcribing audio...');
          
          // Periodically check connection status during long processing operations
          const connectionCheckInterval = setInterval(() => {
            console.log(`[BULK_UPLOAD_DEBUG] Periodic connection check during processing: ${errorHandler.isOffline ? 'offline' : 'online'}`);
            if (errorHandler.isOffline) {
              console.log(`[BULK_UPLOAD_DEBUG] Connection lost during file processing - will report error when operation completes`);
            }
          }, 2000);
          
          try {
            // Actual file processing
            const transcriptId = await bulkUploadProcessor.processFile(file.file, 
              // Status update callback for detailed progress
              (status, progress, result, error, id) => {
                console.log(`[BULK_UPLOAD_DEBUG] File ${file.file.name} status update: ${status}, progress: ${progress}%, ${error ? 'error: ' + error : ''}`);
                updateFileStatus(file.id, status, progress, result, error, id);
              }
            );
            
            clearInterval(connectionCheckInterval);
            
            // Handle the result
            if (transcriptId) {
              console.log(`[BULK_UPLOAD_DEBUG] Successfully processed ${file.file.name} with transcript ID: ${transcriptId}`);
              successCount++;
            } else {
              console.log(`[BULK_UPLOAD_DEBUG] Failed to process ${file.file.name}, no transcript ID returned`);
              errorCount++;
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
  
  // Add a listener for connection restoration
  useEffect(() => {
    // Function to process any pending uploads when connection is restored
    const checkPendingUploads = async () => {
      try {
        console.log('[BULK_UPLOAD_DEBUG] Checking for pending uploads after connection restored');
        
        // Check if there are any pending uploads
        const pendingUploadsStr = localStorage.getItem('pendingUploads');
        if (!pendingUploadsStr) {
          console.log('[BULK_UPLOAD_DEBUG] No pending uploads found');
          return;
        }
        
        const pendingUploads = JSON.parse(pendingUploadsStr);
        if (!Array.isArray(pendingUploads) || pendingUploads.length === 0) {
          console.log('[BULK_UPLOAD_DEBUG] No valid pending uploads found');
          return;
        }
        
        console.log(`[BULK_UPLOAD_DEBUG] Found ${pendingUploads.length} pending uploads to process`);
        
        // Don't process if we're already processing other files
        if (isProcessing) {
          console.log('[BULK_UPLOAD_DEBUG] Already processing other files, skipping pending uploads');
          toast.info('Pending uploads detected', {
            description: 'Will process once current uploads complete'
          });
          return;
        }
        
        // Ask user if they want to process pending uploads
        if (window.confirm(`You have ${pendingUploads.length} pending upload(s) that failed due to connection issues. Do you want to resume uploading now?`)) {
          console.log('[BULK_UPLOAD_DEBUG] User confirmed to process pending uploads');
          
          // Clear the pending uploads first to prevent duplicates
          localStorage.removeItem('pendingUploads');
          
          // Create file entries for each pending upload
          const pendingFiles = pendingUploads.map(item => {
            // Reconstruct the file object from the stored data
            const fileData = item.data;
            
            // Verify file object exists and is valid
            if (!fileData || !fileData.file) {
              console.error('[BULK_UPLOAD_DEBUG] Invalid file data in pending upload:', item.id);
              return null;
            }
            
            return fileData.file;
          }).filter(Boolean) as File[];
          
          // Add the pending files to the queue using the addFiles method
          if (pendingFiles.length > 0) {
            // Add the files to the queue
            addFiles(pendingFiles);
            
            // Show toast
            toast.info(`Added ${pendingFiles.length} pending upload(s)`, {
              description: 'Resuming uploads after connection restored'
            });
            
            // Start processing with a slight delay to ensure UI updates
            setTimeout(() => {
              processQueue();
            }, 1000);
          } else {
            console.log('[BULK_UPLOAD_DEBUG] No valid pending files to restore');
          }
        } else {
          console.log('[BULK_UPLOAD_DEBUG] User declined to process pending uploads');
          localStorage.removeItem('pendingUploads');
          toast.info('Pending uploads cleared', {
            description: 'You can re-upload files at any time'
          });
        }
      } catch (error) {
        console.error('[BULK_UPLOAD_DEBUG] Error processing pending uploads:', error);
        toast.error('Failed to process pending uploads', {
          description: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    };
    
    // Setup listener for connection restored
    const handleConnectionRestored = () => {
      console.log('[BULK_UPLOAD_DEBUG] Connection restored event detected');
      checkPendingUploads();
    };
    
    // Add event listener for connection restored
    window.addEventListener('supabase-connection-restored', handleConnectionRestored);
    
    // Also check on component mount
    if (!errorHandler.isOffline) {
      checkPendingUploads();
    }
    
    // Clean up listener
    return () => {
      window.removeEventListener('supabase-connection-restored', handleConnectionRestored);
    };
  }, [isProcessing, processQueue, addFiles]);
  
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
