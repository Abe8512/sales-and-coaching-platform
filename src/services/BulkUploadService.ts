import React, { useState, useCallback, useMemo } from 'react';
import { useDropzone } from 'react-dropzone';
import { useAuth } from "@/contexts/AuthContext";
import { useWhisperService } from "@/services/WhisperService";
import { useBulkUploadStore, UploadStatus, BulkUploadFile } from "@/store/useBulkUploadStore";
import { useAnalyticsTranscripts } from "@/services/AnalyticsHubService";
import { TranscriptFilter } from "@/services/repositories/TranscriptsRepository";
import { reportError, ErrorCategory } from '@/services/ErrorBridgeService';
import { toast } from "sonner";
import { ServiceResponse, BatchProcessingResponse, createBatchErrorResponse, createBatchResponse, createSuccessResponse, createErrorResponse } from '@/services/ResponseTypes';
import { useEventListener } from '@/services/events';
import { logger } from './LoggingService';
import { useEventsStore } from "@/services/events";
import { BulkUploadProcessorService } from "./BulkUploadProcessorService";
import { debounce } from "lodash";
import { useEffect } from "react";
import { v4 as uuidv4 } from "uuid";

export interface BulkUploadFilter {
  force?: boolean;
}

export interface ProcessResult {
  successCount: number;
  errorCount: number;
  aborted: boolean;
}

// Define a basic event payload structure if not already defined globally
interface EventPayload {
  [key: string]: any;
}

export const useBulkUploadService = () => {
  const { user } = useAuth();
  const { 
    files, 
    addFiles, 
    updateFileStatus, 
    removeFile, 
    clearCompleted,
    setProcessing, 
    isProcessing,
    uploadHistory,
    loadUploadHistory,
    hasLoadedHistory,
  } = useBulkUploadStore();
  
  const { transcribeAudio, saveTranscriptionWithAnalysis } = useWhisperService();
  const { refreshTranscripts: refreshAnalyticsTranscripts } = useAnalyticsTranscripts();
  
  const bulkLogger = logger.getModuleLogger('BulkUploadService');
  const [processingLock, setProcessingLock] = useState(false);
  const dispatchEvent = useEventsStore.getState().dispatchEvent;

  const debouncedLoadHistory = debounce(async () => {
    try {
        await loadUploadHistory();
    } catch (error) {
        reportError(error, ErrorCategory.INTEGRATION, { 
            action: 'BulkUploadService.loadUploadHistory',
            message: 'Failed to load upload history'
        });
    }
  }, 300);
  
  const acquireProcessingLock = () => {
    console.log(`[BulkUploadService] Attempting acquire lock. Current lock state: ${processingLock}`);
    if (processingLock) {
      console.log('[BulkUploadService] Lock acquisition failed - already locked.');
      return false;
    }
    console.log('[BulkUploadService] Acquiring lock.');
    setProcessingLock(true);
    return true;
  };

  const releaseProcessingLock = () => {
    console.log('[BulkUploadService] Releasing lock.');
    setProcessingLock(false);
  };

  const processQueue = async (assignedUserIdParam?: string): Promise<BatchProcessingResponse<ProcessResult>> => {
    const assignedUserId = assignedUserIdParam || user?.id;
    if (!assignedUserId) {
      bulkLogger.error('processQueue requires an assigned user ID. Current user not found.');
      return createBatchErrorResponse<ProcessResult>(new Error('Cannot process queue: User ID not available.'));
    }
    console.log(`[BulkUploadService] processQueue called for user: ${assignedUserId}`);

    if (!acquireProcessingLock()) {
       bulkLogger.warn('Processing already in progress, skipping new processQueue call');
       return createBatchErrorResponse<ProcessResult>(new Error('Processing already in progress'));
    }

    let finalSuccessCount = 0;
    let finalErrorCount = 0;
    let wasAborted = false;
    
    try {
        setProcessing(true); 
        console.log(`[BulkUploadService] Store isProcessing set to true.`);
        
        const allFiles = useBulkUploadStore.getState().files;
        const filesToProcess = allFiles.filter((f: BulkUploadFile) => f.status === 'queued');
        bulkLogger.info(`Starting processing for ${filesToProcess.length} queued files, user: ${assignedUserId}.`);
        console.log('[BulkUploadService] Files in queue:', filesToProcess.map(f => ({id: f.id, name: f.file.name}))); // Log files to be processed

        if (filesToProcess.length === 0) {
            bulkLogger.info('No files in queue to process.');
            // Don't return error, just success with 0 processed
            return createBatchResponse({ successCount: 0, errorCount: 0, aborted: false }, 0, 0);
        }

        dispatchEvent('bulk-upload-started', { count: filesToProcess.length });

        for (const file of filesToProcess) {
          const currentProcessingState = useBulkUploadStore.getState().isProcessing;
          console.log(`[BulkUploadService] Loop check: isProcessing state is ${currentProcessingState}`);
          
          if (!currentProcessingState) {
            bulkLogger.warn('Bulk processing aborted externally (checked latest store state).');
            wasAborted = true;
            break;
          }
          
          updateFileStatus(file.id, 'processing', 10);
          let transcriptId: string | null = null;

          try {
            console.log(`[BulkUploadService] Starting transcribeAudio for ${file.file.name} (User: ${assignedUserId})`);
            const whisperResponse = await transcribeAudio(file.file);
            console.log(`[BulkUploadService] Finished transcribeAudio for ${file.file.name}`);

            if (whisperResponse) {
              updateFileStatus(file.id, 'processing', 80);
              console.log(`[BulkUploadService] Starting saveTranscriptionWithAnalysis for ${file.file.name} (User ID: ${assignedUserId})`);
              const savedTranscription = await saveTranscriptionWithAnalysis(
                assignedUserId,
                whisperResponse.text,
                file.file,
                file.file.name,
                whisperResponse.segments,
                whisperResponse.duration
              );
              console.log(`[BulkUploadService] Finished saveTranscriptionWithAnalysis for ${file.file.name}`);
              
              if (savedTranscription) {
                 transcriptId = savedTranscription.id;
                 updateFileStatus(file.id, 'complete', 100, 'Transcription successful', undefined, transcriptId);
                 finalSuccessCount++;
              } else {
                 console.warn(`saveTranscriptionWithAnalysis returned null for ${file.file.name}`);
                 throw new Error('Failed to save transcription after successful Whisper processing.');
              }
            } else {
              throw new Error('Transcription failed or returned empty response.');
            }
          } catch (error: any) {
            bulkLogger.error(`Error processing file ${file.file.name}:`, error);
            updateFileStatus(file.id, 'error', 0, undefined, error.message || 'Unknown error');
            reportError(error, ErrorCategory.INTEGRATION, { action: 'processQueue_file', fileName: file.file.name });
            finalErrorCount++;
          }
        }

        bulkLogger.info(`Bulk upload loop finished. Success: ${finalSuccessCount}, Errors: ${finalErrorCount}, Aborted: ${wasAborted}`);
        dispatchEvent('bulk-upload-completed', { successCount: finalSuccessCount, errorCount: finalErrorCount });
        
        if (finalSuccessCount > 0) {
           console.log('[BulkUploadService] Refreshing analytics transcripts after batch completion.');
           await refreshAnalyticsTranscripts();
        }
        
        return createBatchResponse(
          { successCount: finalSuccessCount, errorCount: finalErrorCount, aborted: wasAborted },
          finalSuccessCount,
          finalErrorCount
        );
        
    } catch (outerError) {
        bulkLogger.error('Unexpected error during bulk upload process:', outerError);
        reportError(outerError, ErrorCategory.INTEGRATION, { action: 'processQueue_outer', message: 'Unexpected error in processQueue' });
        finalErrorCount = files.filter(f => f.status === 'queued' || f.status === 'error').length - finalSuccessCount;
        wasAborted = true;
        return createBatchErrorResponse<ProcessResult>(
          outerError instanceof Error 
            ? outerError 
            : new Error('Unknown error preparing bulk upload')
        );
    } finally {
        setProcessing(false);
        releaseProcessingLock();
        bulkLogger.debug('Processing lock released, store isProcessing set to false.');
    }
  };
  
  const refreshTranscripts = async (filter?: TranscriptFilter): Promise<ServiceResponse<boolean>> => {
     try {
       // NOTE: This might need to call a function from TranscriptsRepository directly
       // or trigger a refresh via AnalyticsHubService depending on architecture.
       // For now, just log and return success.
       console.log('[BulkUploadService] Refreshing transcripts with filter:', filter);
       // Example: await TranscriptsRepository.getTranscripts({ force: true, ...filter });
       return createSuccessResponse(true);
     } catch (error) {
       reportError(error, ErrorCategory.DATABASE, { 
           action: 'BulkUploadService.refreshTranscripts', 
           filter 
       });
       return createErrorResponse('Failed to refresh transcripts');
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
    refreshTranscripts,
    uploadHistory,
    hasLoadedHistory,
    debouncedLoadHistory,
  };
};
