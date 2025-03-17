
import React, { useContext } from "react";
import { Mic } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeContext } from "@/App";
import { useToast } from "@/hooks/use-toast";

interface WhisperButtonProps {
  recordingId: string;
}

const WhisperButton = ({ recordingId }: WhisperButtonProps) => {
  const { isDarkMode } = useContext(ThemeContext);
  const { toast } = useToast();

  const handleTranscribe = () => {
    toast({
      title: "Transcribing with Whisper",
      description: `Transcribing recording ${recordingId} - connect to bulk_transcriber.py`,
      variant: "default",
    });
  };

  return (
    <Button
      onClick={handleTranscribe}
      className={`gap-2 bg-neon-blue hover:bg-neon-blue/90 text-white`}
      size="sm"
    >
      <Mic className="h-4 w-4" />
      <span>Transcribe with Whisper</span>
    </Button>
  );
};

export default WhisperButton;
