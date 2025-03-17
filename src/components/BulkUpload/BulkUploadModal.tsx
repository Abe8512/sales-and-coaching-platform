
import React, { useContext, useState } from "react";
import { X, Upload, CheckCircle, Clock, AlertCircle } from "lucide-react";
import { ThemeContext } from "@/App";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface BulkUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const BulkUploadModal = ({ isOpen, onClose }: BulkUploadModalProps) => {
  const { isDarkMode } = useContext(ThemeContext);
  const { toast } = useToast();
  const [dragActive, setDragActive] = useState(false);
  
  // Mock data for files
  const mockFiles = [
    { id: 1, name: "sales_call_001.wav", status: "Complete", statusIcon: <CheckCircle className="h-4 w-4 text-neon-green" /> },
    { id: 2, name: "sales_call_002.wav", status: "Processing", statusIcon: <Clock className="h-4 w-4 text-neon-blue" /> },
    { id: 3, name: "customer_meeting_003.wav", status: "Queued", statusIcon: <Clock className="h-4 w-4 text-gray-400" /> },
    { id: 4, name: "product_demo_004.wav", status: "Error", statusIcon: <AlertCircle className="h-4 w-4 text-neon-red" /> }
  ];

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
    
    // Count files
    const fileCount = e.dataTransfer.files.length;
    
    toast({
      title: "Files Detected",
      description: `${fileCount} file(s) ready for processing - connect to bulk_upload_processor.py`,
      variant: "default",
    });
  };
  
  const handleUploadClick = () => {
    toast({
      title: "Uploading Files",
      description: "Uploading files - connect to bulk_upload_processor.py",
      variant: "default",
    });
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
          onClick={() => document.getElementById('fileInput')?.click()}
        >
          <input id="fileInput" type="file" multiple className="hidden" />
          <Upload className={`mx-auto h-12 w-12 mb-4 ${isDarkMode ? "text-gray-400" : "text-gray-500"}`} />
          <h3 className={`font-medium mb-1 ${isDarkMode ? "text-white" : "text-gray-800"}`}>
            Drop files here or click to browse
          </h3>
          <p className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
            Supports WAV, MP3, M4A and other audio formats
          </p>
        </div>
        
        <div className="mt-6">
          <h4 className={`text-sm font-medium mb-3 ${isDarkMode ? "text-white" : "text-gray-800"}`}>Upload Queue</h4>
          <div className={`rounded-lg border ${isDarkMode ? "border-white/10" : "border-gray-200"} overflow-hidden`}>
            <table className="w-full">
              <thead className={isDarkMode ? "bg-white/5" : "bg-gray-50"}>
                <tr className={`text-xs font-medium ${isDarkMode ? "text-gray-400" : "text-gray-500"} uppercase tracking-wider`}>
                  <th className="px-4 py-3 text-left">File Name</th>
                  <th className="px-4 py-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {mockFiles.map((file) => (
                  <tr key={file.id} className={isDarkMode ? "text-white" : "text-gray-800"}>
                    <td className="px-4 py-3 text-sm">{file.name}</td>
                    <td className="px-4 py-3 text-sm text-right">
                      <div className="flex items-center justify-end gap-1">
                        {file.statusIcon}
                        <span>{file.status}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        
        <div className="mt-6 flex justify-end gap-3">
          <DialogClose asChild>
            <Button variant="outline" className={isDarkMode ? "text-white border-white/20" : ""}>
              Cancel
            </Button>
          </DialogClose>
          <Button onClick={handleUploadClick} className="bg-neon-purple hover:bg-neon-purple/90 text-white">
            Upload Files
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BulkUploadModal;
