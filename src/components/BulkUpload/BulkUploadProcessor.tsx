
import React, { useEffect, useState, useCallback } from 'react';
import { useBulkUploadService } from '@/services/BulkUploadService';
import { useToast } from '@/hooks/use-toast';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { 
  Loader2, 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  X, 
  FileAudio, 
  WifiOff, 
  RefreshCw 
} from 'lucide-react';
import { useCallTranscriptService } from '@/services/CallTranscriptService';
import { useEvents } from '@/services/events';
import { useConnectionStatus } from '@/services/ConnectionMonitorService';

const BulkUploadProcessor = () => {
  const { 
    files, 
    isProcessing, 
    processQueue, 
    removeFile, 
    clearCompleted,
    acquireProcessingLock,
    releaseProcessingLock
  } = useBulkUploadService();
  const { toast } = useToast();
  const [totalProgress, setTotalProgress] = useState(0);
  const { fetchTranscripts } = useCallTranscriptService();
  const { dispatchEvent } = useEvents();
  const [isStarting, setIsStarting] = useState(false);
  const [processingError, setProcessingError] = useState<string | null>(null);
  const { isConnected } = useConnectionStatus();
  const [progressInterval, setProgressInterval] = useState<NodeJS.Timeout | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Calculate and update progress periodically
  useEffect(() => {
    const calculateProgress = () => {
      if (files.length > 0) {
        const progress = files.reduce((total, file) => total + file.progress, 0) / files.length;
        setTotalProgress(progress);
      } else {
        setTotalProgress(0);
      }
    };

    // Initial calculation
    calculateProgress();
    
    // Create interval only if not already created
    if (!progressInterval) {
      const interval = setInterval(calculateProgress, 500);
      setProgressInterval(interval);
    }
    
    // Clean up interval on unmount
    return () => {
      if (progressInterval) {
        clearInterval(progressInterval);
        setProgressInterval(null);
      }
    };
  }, [files, progressInterval]);
  
  // Handle completion of all files
  useEffect(() => {
    const allCompleted = files.length > 0 && files.every(file => 
      file.status === "complete" || file.status === "error"
    );
    
    if (allCompleted && isProcessing) {
      console.log('All files completed, refreshing data');
      
      // Refresh transcript data
      fetchTranscripts().catch(error => {
        console.error('Error fetching transcripts after completion:', error);
      });
      
      // Dispatch completion event
      dispatchEvent('bulk-upload-completed', { 
        count: files.length,
        fileIds: files.map(file => file.id),
        transcriptIds: files.map(file => file.transcriptId).filter(Boolean)
      });
      
      // Notify user of completion
      toast({
        title: "Processing Complete",
        description: "All files have been processed successfully. Data has been refreshed.",
      });
      
      // Release processing lock with slight delay to allow state updates
      setTimeout(() => {
        releaseProcessingLock();
      }, 1000);
    }
  }, [files, isProcessing, fetchTranscripts, toast, dispatchEvent, releaseProcessingLock]);
  
  // Dispatch event when processing starts
  useEffect(() => {
    if (isProcessing) {
      dispatchEvent('bulk-upload-started', {
        count: files.filter(f => f.status === 'queued' || f.status === 'processing').length,
        fileIds: files.map(file => file.id)
      });
    }
  }, [isProcessing, files, dispatchEvent]);
  
  // Return appropriate icon based on file status
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "complete":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "processing":
        return <Clock className="h-4 w-4 text-blue-500" />;
      case "queued":
        return <Clock className="h-4 w-4 text-gray-400" />;
      case "error":
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };
  
  // Start processing the queue
  const startProcessing = useCallback(async () => {
    if (files.length === 0) {
      toast({
        title: "No files to process",
        description: "Please add files to the queue first",
        variant: "destructive",
      });
      return;
    }
    
    // Check connection before processing
    if (!isConnected) {
      toast({
        title: "Offline mode",
        description: "You are currently offline. Processing will be available when connection is restored.",
        variant: "destructive",
      });
      return;
    }
    
    setIsStarting(true);
    setProcessingError(null);
    
    // Try to acquire processing lock
    if (!acquireProcessingLock()) {
      toast({
        title: "Processing already in progress",
        description: "Please wait for the current processing to complete",
        variant: "destructive",
      });
      setIsStarting(false);
      return;
    }
    
    toast({
      title: "Processing Started",
      description: `Processing ${files.length} file(s)`,
    });
    
    try {
      await processQueue();
    } catch (error) {
      console.error("Error processing files:", error);
      setProcessingError(error instanceof Error ? error.message : "Unknown error");
      
      toast({
        title: "Processing Error",
        description: "An error occurred while processing files. Please try again.",
        variant: "destructive",
      });
      
      releaseProcessingLock();
    } finally {
      setIsStarting(false);
    }
  }, [files, toast, processQueue, acquireProcessingLock, releaseProcessingLock, isConnected]);

  // Manually refresh the transcripts for when auto-refresh fails
  const handleManualRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchTranscripts({ force: true });
      toast({
        title: "Data Refreshed",
        description: "Transcript data has been manually refreshed",
      });
    } catch (error) {
      console.error("Error refreshing data:", error);
      toast({
        title: "Refresh Failed",
        description: "Failed to refresh data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setRefreshing(false);
    }
  };
  
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Processing Queue</h3>
        <div className="flex gap-2">
          {files.some(file => file.status === "complete") && (
            <Button variant="outline" size="sm" onClick={clearCompleted}>
              Clear Completed
            </Button>
          )}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleManualRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-1 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh Data
          </Button>
        </div>
      </div>
      
      {/* Connection warning banner */}
      {!isConnected && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 p-3 rounded-md flex items-center space-x-2">
          <WifiOff className="h-4 w-4" />
          <span className="text-sm">You're offline. Processing will be available when connection is restored.</span>
        </div>
      )}
      
      {files.length > 0 ? (
        <>
          <div className="border rounded-md overflow-hidden">
            <div className="max-h-[240px] overflow-y-auto">
              {files.map((file) => (
                <div 
                  key={file.id} 
                  className="p-3 flex items-center justify-between border-b last:border-b-0"
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <FileAudio className="h-5 w-5 text-purple-500 flex-shrink-0" />
                    <div className="overflow-hidden">
                      <p className="text-sm truncate">
                        {file.file.name}
                      </p>
                      <div className="w-full mt-1">
                        <Progress value={file.progress} className="h-1" />
                      </div>
                      {file.error && (
                        <p className="text-xs text-red-500 mt-1 truncate">{file.error}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-xs flex items-center gap-1 text-muted-foreground">
                      {getStatusIcon(file.status)}
                      <span>{file.status.charAt(0).toUpperCase() + file.status.slice(1)}</span>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-6 w-6"
                      onClick={() => removeFile(file.id)}
                      disabled={file.status === "processing"}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="flex justify-between items-center">
            <div className="text-sm">
              Total Progress: {Math.round(totalProgress)}%
            </div>
            <Button 
              onClick={startProcessing}
              disabled={isProcessing || isStarting || files.every(f => f.status === "complete") || !isConnected}
            >
              {isProcessing || isStarting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                "Process Files"
              )}
            </Button>
          </div>
          
          {processingError && (
            <div className="text-sm text-red-500 mt-2">
              Error: {processingError}
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-8 border border-dashed rounded-lg text-muted-foreground">
          <p className="text-sm">No files in queue</p>
        </div>
      )}
    </div>
  );
};

export default BulkUploadProcessor;
