import React, { useContext, useState, useRef, useEffect, useCallback } from "react";
import { X, Upload, CheckCircle, Clock, AlertCircle, FileAudio, ToggleLeft, ToggleRight, UserPlus, Loader2 } from "lucide-react";
import { ThemeContext } from "@/App";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useWhisperService } from "@/services/WhisperService";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import BulkUploadProcessor from "./BulkUploadProcessor";
import { useBulkUploadService } from "@/services/BulkUploadService";
import { useAuth } from "@/contexts/AuthContext";
import { EventTypeEnum } from "@/services/events/types";
import { Progress } from "@/components/ui/progress";
import { errorHandler } from "@/services/ErrorHandlingService";
import { checkSupabaseConnection } from "@/integrations/supabase/client";
import { bulkUploadState } from '@/pages/Index';

interface BulkUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const BulkUploadModal = ({ isOpen, onClose }: BulkUploadModalProps) => {
  const { isDarkMode } = useContext(ThemeContext);
  const { toast } = useToast();
  const { getUseLocalWhisper, setUseLocalWhisper } = useWhisperService();
  const { user, getManagedUsers } = useAuth();
  const [dragActive, setDragActive] = useState(false);
  const [openAIKeyMissing, setOpenAIKeyMissing] = useState(false);
  const [useLocalWhisper, setUseLocalWhisperState] = useState(false);
  const [selectedRepId, setSelectedRepId] = useState<string>("");
  const [useCSVProcessor, setUseCSVProcessor] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'online' | 'offline'>('online');
  const { 
    addFiles, 
    setAssignedUserId, 
    processQueue, 
    isProcessing,
    files,
    clearCompleted
  } = useBulkUploadService();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Get team members for rep selection
  const managedUsers = getManagedUsers();
  
  useEffect(() => {
    if (isOpen) {
      // Check if OpenAI API key exists
      const apiKey = localStorage.getItem("openai_api_key");
      setOpenAIKeyMissing(!apiKey || apiKey.trim() === '');
      
      // Check local Whisper setting
      setUseLocalWhisperState(getUseLocalWhisper());
      
      // Set default rep ID to current user if available
      if (user?.id && !selectedRepId) {
        setSelectedRepId(user.id);
      }
      
      // Check connection status
      setConnectionStatus(errorHandler.isOffline ? 'offline' : 'online');
    }
  }, [isOpen, getUseLocalWhisper, user, selectedRepId]);
  
  // Monitor connection status changes
  useEffect(() => {
    const unsubscribe = errorHandler.onConnectionChange((online) => {
      setConnectionStatus(online ? 'online' : 'offline');
    });
    
    return () => unsubscribe();
  }, []);
  
  // Listen for upload errors and display toast
  useEffect(() => {
    const handleUploadError = (event: Event) => {
      const customEvent = event as CustomEvent<{ error: Error }>;
      if (customEvent.detail?.error) {
        toast({
          variant: "destructive",
          title: "Upload Error",
          description: customEvent.detail.error.message || "Failed to upload audio file.",
        });
      }
    };
    
    // Add event listener for upload errors
    window.addEventListener(EventTypeEnum.UPLOAD_ERROR, handleUploadError);
    
    // Clean up
    return () => {
      window.removeEventListener(EventTypeEnum.UPLOAD_ERROR, handleUploadError);
    };
  }, [toast]);
  
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };
  
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
    }
  };

  const handleFiles = (newFiles: FileList | File[]) => {
    // Filter for audio files
    const audioFiles = Array.from(newFiles).filter(file => {
      const isAudio = file.type.startsWith('audio/') || ['m4a', 'mp3', 'wav', 'ogg'].includes(file.name.split('.').pop()?.toLowerCase() || '');
      
      if (!isAudio) {
        toast({
          title: "Invalid file type",
          description: `${file.name} is not a supported audio file. Please upload audio files only.`,
          variant: "destructive",
        });
      }
      
      return isAudio;
    });
    
    if (audioFiles.length === 0) {
      return;
    }
    
    console.log(`Adding ${audioFiles.length} audio files to queue`);
    
    // Add files to the store with the assigned user ID if available
    addFiles(audioFiles, selectedRepId || 'unknown');
    
    // Automatically start processing if not already processing
    if (!isProcessing) {
      console.log('Auto-starting processing queue after adding files');
      processQueue();
    }
  };
  
  const toggleLocalWhisper = (checked: boolean) => {
    setUseLocalWhisperState(checked);
    setUseLocalWhisper(checked);
    toast({
      title: checked ? "Local Whisper Enabled" : "OpenAI API Mode",
      description: checked 
        ? "Transcription will run locally in your browser" 
        : "Transcription will use the OpenAI API",
    });
  };

  const handleRepChange = (value: string) => {
    setSelectedRepId(value);
    setAssignedUserId(value);
    
    // Update global state for the selected rep
    bulkUploadState.setSelectedRep(value);
    
    toast({
      title: "Rep Assignment Updated",
      description: `All uploaded calls will be assigned to ${
        value === user?.id 
        ? "you" 
        : managedUsers.find(u => u.id === value)?.name || "selected rep"
      }`
    });
  };

  // Update the startUpload function to signal upload start
  const startUpload = useCallback(async () => {
    if (files.length === 0) {
      toast.error('Please select at least one file to upload');
      return;
    }

    // Signal that bulk upload is starting
    bulkUploadState.setUploading(true);
    
    // Dispatch event for any components that need to respond
    window.dispatchEvent(new CustomEvent('bulk-upload-started'));
    
    // Start the upload process
    setAssignedUserId(selectedRepId);
    processQueue();
  }, [files, processQueue, selectedRepId, setAssignedUserId]);

  // Update the onClose handler to reset upload state if needed
  const handleClose = useCallback(() => {
    // Only reset if we're closing and there are no active uploads
    const hasActiveUploads = files.some(f => 
      f.status === 'processing' || f.status === 'queued'
    );
    
    if (!hasActiveUploads) {
      bulkUploadState.setUploading(false);
    }
    
    onClose();
  }, [onClose, files]);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className={`sm:max-w-[600px] ${isDarkMode ? "bg-dark-purple border border-white/10" : "bg-white"}`}>
        <DialogHeader>
          <DialogTitle className={isDarkMode ? "text-white" : "text-gray-800"}>Bulk Upload Recordings</DialogTitle>
          <DialogDescription className={isDarkMode ? "text-gray-400" : "text-gray-500"}>
            Upload multiple audio files for transcription and analysis with Whisper AI
          </DialogDescription>
        </DialogHeader>
        
        {/* Connection Status Banner */}
        {connectionStatus === 'offline' && (
          <div className="mb-4 p-3 rounded bg-red-500/10 border border-red-500/30 text-red-500 text-sm flex items-center">
            <AlertCircle className="h-4 w-4 mr-2 flex-shrink-0" />
            <div className="flex-1">
              <p>Connection to database is offline. Uploads will not process until connection is restored.</p>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => {
                checkSupabaseConnection().then(success => {
                  if (success) {
                    toast({
                      title: "Connection restored",
                      description: "Database connection successfully restored.",
                    });
                  } else {
                    toast({
                      title: "Connection failed",
                      description: "Still unable to connect. Please check your API keys.",
                      variant: "destructive",
                    });
                  }
                });
              }}
              className="ml-2 h-8 text-xs border-red-500/30 text-red-500 hover:bg-red-500/10"
            >
              Retry
            </Button>
          </div>
        )}
        
        <div className="grid grid-cols-1 gap-4 mb-2">
          {/* Rep Selection Dropdown */}
          <div className="space-y-2">
            <Label htmlFor="sales-rep-select" className="text-sm flex items-center">
              <UserPlus className="h-4 w-4 mr-1" /> 
              Assign Calls to Sales Rep
            </Label>
            
            <Select value={selectedRepId} onValueChange={handleRepChange}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a sales rep" />
              </SelectTrigger>
              <SelectContent>
                {user && (
                  <SelectItem value={user.id}>
                    {user.name || 'Current User'} (You)
                  </SelectItem>
                )}
                
                {managedUsers && managedUsers.length > 0 && (
                  managedUsers
                    .filter(rep => rep.id !== user?.id) // Filter out current user
                    .map(rep => (
                      <SelectItem key={rep.id} value={rep.id}>
                        {rep.name}
                      </SelectItem>
                    ))
                )}
              </SelectContent>
            </Select>
          </div>
          
          {/* Whisper Mode Toggle */}
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-2">
              <Switch 
                id="whisper-mode" 
                checked={useLocalWhisper}
                onCheckedChange={toggleLocalWhisper}
              />
              <Label htmlFor="whisper-mode" className="text-sm flex items-center">
                {useLocalWhisper ? (
                  <>
                    <ToggleRight className="h-4 w-4 mr-1 text-neon-purple" /> 
                    Using Local Whisper (Browser-based)
                  </>
                ) : (
                  <>
                    <ToggleLeft className="h-4 w-4 mr-1" /> 
                    Using OpenAI API
                    {openAIKeyMissing && (
                      <span className="ml-2 text-xs text-red-500">(API Key Required)</span>
                    )}
                  </>
                )}
              </Label>
            </div>
          </div>
          
          {/* CSV Processor Toggle */}
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-2">
              <Switch 
                id="csv-processor" 
                checked={useCSVProcessor}
                onCheckedChange={setUseCSVProcessor}
              />
              <Label htmlFor="csv-processor" className="text-sm flex items-center">
                Upload CSV data instead of audio files
              </Label>
            </div>
          </div>
        </div>
        
        {!useCSVProcessor ? (
          <div 
            className={`mt-4 border-2 border-dashed rounded-lg p-8 text-center ${
              dragActive 
                ? isDarkMode 
                  ? "border-purple-500 bg-purple-500/10" 
                  : "border-purple-500 bg-purple-500/5"
                : isDarkMode
                  ? "border-gray-700 hover:border-gray-600"
                  : "border-gray-300 hover:border-gray-400"
            } transition-all cursor-pointer`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input 
              ref={fileInputRef}
              id="fileInput" 
              type="file" 
              multiple 
              accept="audio/*,.wav,.mp3,.m4a,.webm" 
              className="hidden" 
              onChange={handleFileInputChange}
            />
            <Upload className={`mx-auto h-12 w-12 mb-4 ${isDarkMode ? "text-gray-400" : "text-gray-500"}`} />
            <h3 className={`font-medium mb-1 ${isDarkMode ? "text-white" : "text-gray-800"}`}>
              Drop audio files here or click to browse
            </h3>
            <p className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
              Supports WAV, MP3, M4A and other audio formats
            </p>
          </div>
        ) : (
          <div className="mt-6">
            <BulkUploadProcessor />
          </div>
        )}
        
        {/* File Upload Progress Tracking */}
        {files.length > 0 && (
          <div className={`mt-4 p-4 rounded-lg ${isDarkMode ? "bg-slate-900/50" : "bg-slate-100"}`}>
            <div className="flex justify-between items-center mb-2">
              <h4 className={`text-sm font-medium ${isDarkMode ? "text-white" : "text-gray-800"}`}>
                Upload Progress
              </h4>
              <div className="flex space-x-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => clearCompleted()}
                  disabled={!files.some(f => f.status === 'complete')}
                  className="text-xs h-7 px-2"
                >
                  Clear Completed
                </Button>
              </div>
            </div>
            
            {/* Progress summary */}
            <div className="mb-3 text-xs flex justify-between items-center">
              <div className={isDarkMode ? "text-gray-400" : "text-gray-600"}>
                {isProcessing ? (
                  <span className="flex items-center">
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    Processing...
                  </span>
                ) : (
                  <span>
                    Ready to process
                  </span>
                )}
              </div>
              <div className={isDarkMode ? "text-gray-400" : "text-gray-600"}>
                {files.filter(f => f.status === 'complete').length} of {files.length} files completed
                {files.some(f => f.status === 'error') && (
                  <span className="text-red-500 ml-1">
                    ({files.filter(f => f.status === 'error').length} failed)
                  </span>
                )}
              </div>
            </div>
            
            <div className="space-y-3 max-h-[200px] overflow-y-auto pr-2">
              {files.map((file) => (
                <div key={file.id} className="space-y-1">
                  <div className="flex justify-between items-center text-xs">
                    <div className="flex items-center gap-2 truncate max-w-[340px]">
                      <FileAudio className="h-3.5 w-3.5" />
                      <span className="truncate">{file.file.name}</span>
                    </div>
                    <div className="flex items-center">
                      {file.status === 'queued' && (
                        <span className="flex items-center text-amber-500 dark:text-amber-400">
                          <Clock className="h-3.5 w-3.5 mr-1" />
                          Queued
                        </span>
                      )}
                      {file.status === 'processing' && (
                        <span className="flex items-center text-blue-500 dark:text-blue-400">
                          <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                          Processing
                        </span>
                      )}
                      {file.status === 'complete' && (
                        <span className="flex items-center text-green-500 dark:text-green-400">
                          <CheckCircle className="h-3.5 w-3.5 mr-1" />
                          Complete
                        </span>
                      )}
                      {file.status === 'error' && (
                        <span className="flex items-center text-red-500 dark:text-red-400">
                          <AlertCircle className="h-3.5 w-3.5 mr-1" />
                          Error
                        </span>
                      )}
                    </div>
                  </div>
                  <Progress 
                    value={file.progress} 
                    className={`h-1.5 ${
                      file.status === 'complete' 
                        ? 'bg-green-100 dark:bg-green-950' 
                        : file.status === 'error' 
                          ? 'bg-red-100 dark:bg-red-950' 
                          : 'bg-slate-200 dark:bg-slate-800'
                    }`}
                    indicatorClassName={
                      file.status === 'complete' 
                        ? 'bg-green-500 dark:bg-green-400' 
                        : file.status === 'error' 
                          ? 'bg-red-500 dark:bg-red-400' 
                          : file.status === 'processing'
                            ? 'bg-blue-500 dark:bg-blue-400'
                            : 'bg-amber-500 dark:bg-amber-400'
                    }
                  />
                  {file.error && (
                    <p className="text-xs text-red-500 dark:text-red-400 mt-1">
                      {file.error}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
        
        <div className="mt-4 flex justify-end gap-3">
          <Button 
            onClick={startUpload}
            disabled={isProcessing || files.length === 0 || connectionStatus === 'offline'}
            className="bg-neon-purple hover:bg-neon-purple/90 text-white"
          >
            {isProcessing ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Processing...</>
            ) : files.some(f => f.status === 'queued') ? (
              "Process Files"
            ) : (
              "Process Files"
            )}
          </Button>
          <DialogClose asChild>
            <Button variant="outline" className={isDarkMode ? "text-white border-white/20" : ""}>
              Close
            </Button>
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BulkUploadModal;
