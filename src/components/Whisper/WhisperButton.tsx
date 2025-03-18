
import React, { useContext, useState } from "react";
import { Mic, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeContext } from "@/App";
import { useToast } from "@/hooks/use-toast";
import { useWhisperService, getStoredTranscriptions } from "@/services/WhisperService";
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
    // For demo purposes, we'll simulate finding the recording and redirecting to transcripts
    setIsProcessing(true);
    
    setTimeout(() => {
      const transcriptions = getStoredTranscriptions();
      
      if (transcriptions.length > 0) {
        toast({
          title: "Recording Found",
          description: "Redirecting to transcript details",
        });
        
        navigate("/transcripts");
      } else {
        toast({
          title: "No Transcriptions Available",
          description: "Please upload audio files or record a call first",
          variant: "destructive",
        });
      }
      
      setIsProcessing(false);
    }, 1000);
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
