
import React, { useContext, useState, useRef, useEffect } from "react";
import { X, Upload, CheckCircle, Clock, AlertCircle, FileAudio, ToggleLeft, ToggleRight, UserPlus } from "lucide-react";
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
  const { addFiles, setAssignedUserId } = useBulkUploadService();
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
    }
  }, [isOpen, getUseLocalWhisper, user, selectedRepId]);
  
  // Listen for upload errors and display toast
  useEffect(() => {
    const handleUploadError = (event: CustomEvent) => {
      if (event.detail?.error) {
        toast({
          variant: "destructive",
          title: "Upload Error",
          description: event.detail.error.message || "Failed to upload audio file.",
        });
      }
    };
    
    // Add event listener for upload errors
    window.addEventListener('upload-error' as any, handleUploadError as EventListener);
    
    // Clean up
    return () => {
      window.removeEventListener('upload-error' as any, handleUploadError as EventListener);
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

  const handleFiles = (fileList: FileList) => {
    // Handle API key check for non-local Whisper
    if (!useLocalWhisper && openAIKeyMissing) {
      toast({
        title: "API Key Required",
        description: "Please add your OpenAI API key in Settings or enable local Whisper",
        variant: "destructive",
      });
      return;
    }
    
    const audioFiles = Array.from(fileList).filter(file => 
      file.type.includes('audio') || 
      file.name.toLowerCase().endsWith('.wav') ||
      file.name.toLowerCase().endsWith('.mp3') ||
      file.name.toLowerCase().endsWith('.m4a') ||
      file.name.toLowerCase().endsWith('.webm')
    );
    
    if (audioFiles.length === 0) {
      toast({
        title: "Invalid Files",
        description: "Please upload audio files only (WAV, MP3, M4A, etc.)",
        variant: "destructive",
      });
      return;
    }
    
    // Assign the selected rep ID for these files
    setAssignedUserId(selectedRepId);
    addFiles(audioFiles);
    
    toast({
      title: "Files Added",
      description: `${audioFiles.length} audio file(s) added to queue`,
    });
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
    toast({
      title: "Sales Rep Selected",
      description: "All uploaded files will be assigned to this rep"
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={`sm:max-w-[600px] ${isDarkMode ? "bg-dark-purple border border-white/10" : "bg-white"}`}>
        <DialogHeader>
          <DialogTitle className={isDarkMode ? "text-white" : "text-gray-800"}>Bulk Upload Recordings</DialogTitle>
          <DialogDescription className={isDarkMode ? "text-gray-400" : "text-gray-500"}>
            Upload multiple audio files for transcription and analysis with Whisper AI
          </DialogDescription>
        </DialogHeader>
        
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
            <Switch
              id="bulk-upload-local-whisper"
              checked={useLocalWhisper}
              onCheckedChange={toggleLocalWhisper}
            />
            <Label htmlFor="bulk-upload-local-whisper" className="text-sm">
              {useLocalWhisper ? (
                <span className="flex items-center">
                  <ToggleRight className="h-4 w-4 mr-1 text-green-500" /> 
                  Use Local Whisper (Browser-Based)
                </span>
              ) : (
                <span className="flex items-center">
                  <ToggleLeft className="h-4 w-4 mr-1 text-gray-500" /> 
                  Use OpenAI API (Requires API Key)
                </span>
              )}
            </Label>
          </div>
        </div>
        
        {openAIKeyMissing && !useLocalWhisper && (
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-md p-3 mb-4">
            <p className="text-sm text-amber-800 dark:text-amber-200">
              OpenAI API key is required for API transcription. Please enable local Whisper or set your API key in the Settings page.
            </p>
          </div>
        )}
        
        {useLocalWhisper && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md p-3 mb-4">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              Using local Whisper model. The first transcription may take longer as the model downloads.
            </p>
          </div>
        )}
        
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
        
        <div className="mt-6">
          <BulkUploadProcessor />
        </div>
        
        <div className="mt-4 flex justify-end gap-3">
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
