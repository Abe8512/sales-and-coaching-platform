
import React, { useContext, useState } from "react";
import { Mic, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeContext } from "@/App";
import { useToast } from "@/hooks/use-toast";
import { getStoredTranscriptions } from "@/services/WhisperService";
import { useNavigate } from "react-router-dom";

interface WhisperButtonProps {
  recordingId: string;
}

const WhisperButton = ({ recordingId }: WhisperButtonProps) => {
  const { isDarkMode } = useContext(ThemeContext);
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isProcessing, setIsProcessing] = useState(false);
  
  const handleTranscribe = () => {
    setIsProcessing(true);
    
    // Get all transcriptions
    const transcriptions = getStoredTranscriptions();
    
    // Find the specific transcription by ID or use latest if "latest" is passed
    let transcription;
    
    if (recordingId === "latest") {
      // Sort by date (newest first) and take the first one
      transcription = transcriptions.length > 0 
        ? [...transcriptions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]
        : null;
    } else {
      transcription = transcriptions.find(t => t.id === recordingId) || 
                      (transcriptions.length > 0 ? transcriptions[0] : null);
    }
    
    setTimeout(() => {
      if (transcription) {
        toast({
          title: "Transcript Available",
          description: "Viewing transcript details",
        });
        
        // Navigate to the transcript view with the ID
        navigate(`/transcripts?id=${transcription.id}`);
      } else {
        toast({
          title: "No Transcription Available",
          description: "Please upload audio files or record a call first",
          variant: "destructive",
        });
      }
      
      setIsProcessing(false);
    }, 500);
  };

  return (
    <Button
      onClick={handleTranscribe}
      className={`gap-2 bg-blue-500 hover:bg-blue-600 text-white`}
      size="sm"
      disabled={isProcessing}
    >
      {isProcessing ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Mic className="h-4 w-4" />
      )}
      <span>View Transcript</span>
    </Button>
  );
};

export default WhisperButton;
