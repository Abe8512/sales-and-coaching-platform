
import React, { useEffect, useState } from 'react';
import { useBulkUploadService } from '@/services/BulkUploadService';
import { useToast } from '@/hooks/use-toast';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle, AlertCircle, Clock, X, FileAudio } from 'lucide-react';

const BulkUploadProcessor = () => {
  const { 
    files, 
    isProcessing, 
    processQueue, 
    removeFile, 
    clearCompleted 
  } = useBulkUploadService();
  const { toast } = useToast();
  const [totalProgress, setTotalProgress] = useState(0);
  
  useEffect(() => {
    // Calculate total progress
    if (files.length > 0) {
      const progress = files.reduce((total, file) => total + file.progress, 0) / files.length;
      setTotalProgress(progress);
    } else {
      setTotalProgress(0);
    }
  }, [files]);
  
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
  
  const startProcessing = () => {
    if (files.length === 0) {
      toast({
        title: "No files to process",
        description: "Please add files to the queue first",
        variant: "destructive",
      });
      return;
    }
    
    toast({
      title: "Processing Started",
      description: `Processing ${files.length} file(s)`,
    });
    
    processQueue();
  };
  
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Processing Queue</h3>
        {files.some(file => file.status === "complete") && (
          <Button variant="outline" size="sm" onClick={clearCompleted}>
            Clear Completed
          </Button>
        )}
      </div>
      
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
              disabled={isProcessing || files.every(f => f.status === "complete")}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                "Process Files"
              )}
            </Button>
          </div>
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
