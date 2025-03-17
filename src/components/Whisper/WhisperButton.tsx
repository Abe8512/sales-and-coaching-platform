
import React, { useContext } from "react";
import { Bot, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeContext } from "@/App";
import { useToast } from "@/hooks/use-toast";

interface WhisperButtonProps {
  recordingId?: string;
}

const WhisperButton = ({ recordingId }: WhisperButtonProps) => {
  const { isDarkMode } = useContext(ThemeContext);
  const { toast } = useToast();

  const handleTranscribe = () => {
    toast({
      title: "Whisper Transcription",
      description: `Transcribing with Whisper - connect to bulk_transcriber.py (Recording ID: ${recordingId || "unknown"})`,
      variant: "default",
    });
  };

  return (
    <Button
      onClick={handleTranscribe}
      variant="outline"
      className={`gap-2 ${
        isDarkMode
          ? "bg-neon-purple/20 text-white hover:bg-neon-purple/30"
          : "bg-neon-purple/10 text-gray-800 hover:bg-neon-purple/20"
      }`}
      size="sm"
    >
      <Bot className="h-4 w-4 text-neon-purple" />
      <span>Transcribe with Whisper</span>
    </Button>
  );
};

export default WhisperButton;
