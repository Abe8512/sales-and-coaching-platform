
import React, { useContext, useState, useRef } from "react";
import { X, Upload, CheckCircle, Clock, AlertCircle, FileAudio } from "lucide-react";
import { ThemeContext } from "@/App";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useWhisperService } from "@/services/WhisperService";
import { Progress } from "@/components/ui/progress";

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
  const { transcribeAudio, saveTranscriptionWithAnalysis } = useWhisperService();
  const [dragActive, setDragActive] = useState(false);
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "complete":
        return <CheckCircle className="h-4 w-4 text-neon-green" />;
      case "processing":
        return <Clock className="h-4 w-4 text-neon-blue" />;
      case "queued":
        return <Clock className="h-4 w-4 text-gray-400" />;
      case "error":
        return <AlertCircle className="h-4 w-4 text-neon-red" />;
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
      file.type.includes('audio') || file.name.toLowerCase().endsWith('.wav')
    );
    
    if (audioFiles.length === 0) {
      toast({
        title: "Invalid Files",
        description: "Please upload audio files only (WAV, MP3, etc.)",
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
  
  const processFiles = async () => {
    if (files.length === 0 || isUploading) return;
    
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
        
        // Simulating progress updates
        const progressInterval = setInterval(() => {
          setFiles(prev => {
            const currentFile = prev.find(f => f.id === file.id);
            if (currentFile && currentFile.status === "processing" && currentFile.progress < 90) {
              return prev.map(f => 
                f.id === file.id ? { ...f, progress: Math.min(f.progress + 10, 90) } : f
              );
            }
            return prev;
          });
        }, 500);
        
        // Transcribe the audio file
        const result = await transcribeAudio(file.file);
        
        clearInterval(progressInterval);
        
        if (result) {
          setFiles(prev => 
            prev.map(f => f.id === file.id ? { 
              ...f, 
              status: "complete", 
              progress: 100,
              result: result.text
            } : f)
          );
          
          // Save transcription with analysis
          saveTranscriptionWithAnalysis(result.text, file.file.name);
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
            Upload multiple audio files for analysis and transcription
          </DialogDescription>
        </DialogHeader>
        
        <div 
          className={`mt-4 border-2 border-dashed rounded-lg p-8 text-center ${
            dragActive 
              ? isDarkMode 
                ? "border-neon-purple bg-neon-purple/10" 
                : "border-neon-purple bg-neon-purple/5"
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
            accept="audio/*,.wav" 
            className="hidden" 
            onChange={handleFileInputChange}
          />
          <Upload className={`mx-auto h-12 w-12 mb-4 ${isDarkMode ? "text-gray-400" : "text-gray-500"}`} />
          <h3 className={`font-medium mb-1 ${isDarkMode ? "text-white" : "text-gray-800"}`}>
            Drop files here or click to browse
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
                      <FileAudio className="h-5 w-5 text-neon-purple flex-shrink-0" />
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
            disabled={files.length === 0 || isUploading || files.every(f => f.status === "complete")}
            className="bg-neon-purple hover:bg-neon-purple/90 text-white"
          >
            {isUploading ? "Processing..." : "Process Files"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BulkUploadModal;
