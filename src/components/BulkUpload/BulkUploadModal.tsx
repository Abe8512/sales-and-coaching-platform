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
import { useBulkUploadStore } from "@/store/useBulkUploadStore";
// import { useErrorHandler } from "@/hooks/use-error-handler";
import { Badge } from "@/components/ui/badge";
import { getStoredTeamMembers, useTeamMembers } from '@/services/TeamService';

// Define missing types
type FileStatus = 'queued' | 'processing' | 'completed' | 'complete' | 'error';

interface UploadFile {
  id: string;
  name: string;
  size: number;
  type: string;
  status: FileStatus;
  progress: number;
  error?: string;
  audioBuffer?: ArrayBuffer;
  transcriptId?: string;
}

// Update bulkUploadState interface
interface BulkUploadState {
  isUploading: boolean;
  selectedRepId: string | null;
  setUploading: (value: boolean) => void;
  setSelectedRep: (value: string) => void;
  setFiles?: (files: UploadFile[]) => void;
  updateFile?: (id: string, updates: Partial<UploadFile>) => void;
}

// Modified useErrorHandler with proper typing
const useErrorHandler = () => {
  return {
    isOffline: false,
    handleError: (error: Error | string | unknown) => console.error(error),
    clearError: () => {},
    onConnectionChange: (callback: (isOnline: boolean) => void) => () => {}
  };
};

interface BulkUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const BulkUploadModal = ({ isOpen, onClose }: BulkUploadModalProps) => {
  const { isDarkMode } = useContext(ThemeContext);
  const { toast } = useToast();
  const { user, getManagedUsers, refreshTeamMembers } = useAuth();
  const [dragActive, setDragActive] = useState(false);
  const [openAIKeyMissing, setOpenAIKeyMissing] = useState(false);
  const [selectedRepId, setSelectedRepId] = useState<string>("");
  const [useCSVProcessor, setUseCSVProcessor] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'online' | 'offline' | 'checking'>('online');
  const { 
    addFiles, 
    processQueue, 
    isProcessing,
    files,
    clearCompleted
  } = useBulkUploadService();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const errorHandler = useErrorHandler();
  
  // Get team members from both sources to ensure all are displayed
  const managedUsers = getManagedUsers();
  const { teamMembers, refreshTeamMembers: refreshLocalTeam } = useTeamMembers();
  
  // Keep track of last refresh time to debounce refreshTeamMembers calls
  const [lastRefresh, setLastRefresh] = useState<number>(0);

  useEffect(() => {
    if (isOpen) {
      const now = Date.now();
      
      try {
        // Only refresh from Auth context once every 30 seconds to avoid constant 404 errors
        if (now - lastRefresh > 30000) { // 30 second debounce
          setLastRefresh(now);
          refreshTeamMembers?.();
        }
      } catch (error) {
        console.error("Error refreshing team members from Auth:", error);
      }
      
      // Always ensure we have the latest team members from TeamService
      refreshLocalTeam();
      
      // Check if OpenAI API key exists
      const apiKey = localStorage.getItem("openai_api_key");
      setOpenAIKeyMissing(!apiKey || apiKey.trim() === '');
      
      // Set default rep ID to current user if available
      if (user?.id && !selectedRepId) {
        setSelectedRepId(user.id);
      }
      
      // Check connection status
      setConnectionStatus(errorHandler.isOffline ? 'offline' : 'online');
    }
  }, [isOpen, refreshTeamMembers, refreshLocalTeam, user, selectedRepId, lastRefresh]);
  
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

  const handleRepChange = (value: string) => {
    setSelectedRepId(value);
    
    // Find the selected member from either source
    const selectedMember = 
      teamMembers.find(m => m.id === value) || 
      managedUsers.find(u => u.id === value) || 
      user;
    
    // Dispatch an event to notify that this team member is getting assigned calls
    window.dispatchEvent(new CustomEvent('team-member-selected', { 
      detail: { 
        id: value, 
        name: selectedMember?.name || 'Unknown',
        source: 'bulk-upload' 
      } 
    }));
    
    toast({
      title: "Rep Assignment Updated",
      description: `All uploaded calls will be assigned to ${value === user?.id ? "you" : selectedMember?.name || "selected rep"}`
    });
  };

  // Update the startUpload function to signal upload start
  const startUpload = useCallback(async () => {
    console.log('[BulkUploadModal] startUpload called.');
    if (files.length === 0) {
      toast({
        variant: "destructive",
        title: "No files selected",
        description: "Please select at least one file to upload"
      });
      console.log('[BulkUploadModal] No files, returning.');
      return;
    }
    
    // Determine the user ID to assign the calls to
    // Default to the selected rep in the dropdown, fallback to current user
    const assignedUserId = selectedRepId || user?.id;
    
    if (!assignedUserId) {
        toast({
          variant: "destructive",
          title: "User Assignment Error",
          description: "Could not determine user to assign calls to. Please select a rep or ensure you are logged in."
        });
        console.error('[BulkUploadModal] Cannot start upload - no assignedUserId.');
        return;
    }
    
    console.log(`[BulkUploadModal] Calling processQueue for ${files.length} files, assigning to user: ${assignedUserId}`);
    // Pass the assignedUserId to processQueue
    processQueue(assignedUserId); 
  }, [files, processQueue, selectedRepId, user]);

  // Update the onClose handler to reset upload state if needed
  const handleClose = useCallback(() => {
    // Only reset if we're closing and there are no active uploads
    const hasActiveUploads = files.some(f => 
      f.status === 'processing' || f.status === 'queued'
    );
    
    if (!hasActiveUploads) {
      processQueue();
    }
    
    onClose();
  }, [onClose, files, processQueue]);

  // Function to check connection status
  const checkConnectionStatus = async () => {
    setConnectionStatus('checking');
    try {
      // Use fetch with a timeout to check connection
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch('https://api.openai.com/v1/engines', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      setConnectionStatus(response.ok ? 'online' : 'offline');
    } catch (error) {
      console.error('Connection check failed:', error);
      setConnectionStatus('offline');
    }
  };

  // Function to check if OpenAI API key is set
  const checkOpenAIKey = async () => {
    try {
      // Simple check if API key exists in localStorage as a fallback
      const apiKey = localStorage.getItem("openai_api_key");
      setOpenAIKeyMissing(!apiKey || apiKey.trim() === '');
    } catch (error) {
      console.error('Error checking OpenAI key:', error);
      setOpenAIKeyMissing(true);
    }
  };

  // Comment out or remove problematic sections until we can properly fix them
  // const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
  //   // ... implementation
  // };

  // const handleUploadAll = async () => {
  //   // ... implementation
  // };

  // const updateFileStatus = (
  //   id: string, 
  //   status: FileStatus, 
  //   progress: number,
  //   error?: string,
  //   transcriptId?: string
  // ) => {
  //   // ... implementation
  // };

  // const processWithWhisper = async (file: UploadFile, userId: string) => {
  //   // ... implementation
  // };

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
            
            <div className="mb-4">
              <Label className="text-sm mb-2 block">Assign to Team Member</Label>
              <Select 
                value={selectedRepId} 
                onValueChange={handleRepChange}
                disabled={isProcessing}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a team member" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={user?.id || ''}>
                    {user?.name || 'Me'} (You)
                  </SelectItem>
                  {/* Show team members from TeamService first */}
                  {teamMembers.map(member => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.name}
                    </SelectItem>
                  ))}
                  {/* Also show managed users from AuthContext that aren't already in teamMembers */}
                  {managedUsers
                    .filter(user => !teamMembers.some(member => member.id === user.id))
                    .map(user => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name}
                      </SelectItem>
                    ))
                  }
                </SelectContent>
              </Select>
              <p className={`text-xs mt-1 ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
                Call data will be associated with the selected team member
              </p>
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
