
import React, { useContext, useState, useRef, useEffect } from "react";
import { X, Upload, CheckCircle, Clock, AlertCircle, FileAudio, ToggleLeft, ToggleRight } from "lucide-react";
import { ThemeContext } from "@/App";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useWhisperService } from "@/services/WhisperService";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface BulkUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface UploadFile {
  id: string;
  file: File;
  status: "queued" | "processing" | "complete" | "error";
  progress: number;
  result?: string;
  error?: string;
}

const BulkUploadModal = ({ isOpen, onClose }: BulkUploadModalProps) => {
  const { isDarkMode } = useContext(ThemeContext);
  const { toast } = useToast();
  const { transcribeAudio, saveTranscriptionWithAnalysis, getUseLocalWhisper, setUseLocalWhisper } = useWhisperService();
  const [dragActive, setDragActive] = useState(false);
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [openAIKeyMissing, setOpenAIKeyMissing] = useState(false);
  const [useLocalWhisper, setUseLocalWhisperState] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  useEffect(() => {
    if (isOpen) {
      // Check if OpenAI API key exists
      const apiKey = localStorage.getItem("openai_api_key");
      setOpenAIKeyMissing(!apiKey || apiKey.trim() === '');
      
      // Check local Whisper setting
      setUseLocalWhisperState(getUseLocalWhisper());
    }
  }, [isOpen, getUseLocalWhisper]);
  
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
    
    const newFiles = audioFiles.map(file => ({
      id: crypto.randomUUID(),
      file,
      status: "queued" as const,
      progress: 0
    }));
    
    setFiles(prev => [...prev, ...newFiles]);
    
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
  
  const processFiles = async () => {
    if (files.length === 0 || isUploading) return;
    
    if (openAIKeyMissing && !useLocalWhisper) {
      toast({
        title: "Configuration Required",
        description: "Please set your OpenAI API key in Settings or enable local Whisper",
        variant: "destructive",
      });
      return;
    }
    
    setIsUploading(true);
    
    // Process files sequentially
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      // Skip already processed files
      if (file.status === "complete" || file.status === "error") continue;
      
      try {
        // Update status to processing
        setFiles(prev => 
          prev.map(f => f.id === file.id ? { ...f, status: "processing", progress: 10 } : f)
        );
        
        // Update progress as we process
        setFiles(prev => 
          prev.map(f => f.id === file.id ? { ...f, progress: 30 } : f)
        );
        
        // Transcribe the audio file
        const result = await transcribeAudio(file.file);
        
        setFiles(prev => 
          prev.map(f => f.id === file.id ? { ...f, progress: 70 } : f)
        );
        
        if (result) {
          // Save transcription with analysis
          await saveTranscriptionWithAnalysis(result.text, file.file, file.file.name);
          
          setFiles(prev => 
            prev.map(f => f.id === file.id ? { 
              ...f, 
              status: "complete", 
              progress: 100,
              result: result.text
            } : f)
          );
        } else {
          throw new Error("Transcription failed");
        }
      } catch (error) {
        console.error(`Error processing file ${file.file.name}:`, error);
        setFiles(prev => 
          prev.map(f => f.id === file.id ? { 
            ...f, 
            status: "error", 
            progress: 100,
            error: error instanceof Error ? error.message : "Transcription failed"
          } : f)
        );
      }
    }
    
    setIsUploading(false);
    
    toast({
      title: "Processing Complete",
      description: "All files have been processed",
    });
  };
  
  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(file => file.id !== id));
  };
  
  const clearCompleted = () => {
    setFiles(prev => prev.filter(file => file.status !== "complete"));
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
        
        <div className="flex items-center space-x-2 my-2">
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
          <div className="flex justify-between items-center mb-3">
            <h4 className={`text-sm font-medium ${isDarkMode ? "text-white" : "text-gray-800"}`}>Upload Queue</h4>
            {files.some(file => file.status === "complete") && (
              <Button variant="ghost" size="sm" onClick={clearCompleted} className="text-xs">
                Clear Completed
              </Button>
            )}
          </div>
          
          {files.length > 0 ? (
            <div className={`rounded-lg border ${isDarkMode ? "border-white/10" : "border-gray-200"} overflow-hidden`}>
              <div className="max-h-[240px] overflow-y-auto">
                {files.map((file) => (
                  <div 
                    key={file.id} 
                    className={`p-3 flex items-center justify-between ${
                      isDarkMode ? "border-white/10" : "border-gray-200"
                    } border-b last:border-b-0`}
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <FileAudio className="h-5 w-5 text-purple-500 flex-shrink-0" />
                      <div className="overflow-hidden">
                        <p className={`text-sm truncate ${isDarkMode ? "text-white" : "text-gray-800"}`}>
                          {file.file.name}
                        </p>
                        <div className="w-full mt-1">
                          <Progress value={file.progress} className="h-1" />
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={`text-xs flex items-center gap-1 ${isDarkMode ? "text-gray-300" : "text-gray-600"}`}>
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
          ) : (
            <div className={`text-center py-8 border border-dashed rounded-lg ${isDarkMode ? "text-gray-500 border-gray-700" : "text-gray-400 border-gray-300"}`}>
              <p className="text-sm">No files in queue</p>
            </div>
          )}
        </div>
        
        <div className="mt-6 flex justify-end gap-3">
          <DialogClose asChild>
            <Button variant="outline" className={isDarkMode ? "text-white border-white/20" : ""}>
              Cancel
            </Button>
          </DialogClose>
          <Button 
            onClick={processFiles}
            disabled={files.length === 0 || isUploading || files.every(f => f.status === "complete") || (openAIKeyMissing && !useLocalWhisper)}
            className="bg-purple-600 hover:bg-purple-700 text-white"
          >
            {isUploading ? 
              (useLocalWhisper ? "Processing locally..." : "Processing with API...") : 
              (useLocalWhisper ? "Process with Local Whisper" : "Process with Whisper API")
            }
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BulkUploadModal;
