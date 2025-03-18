
import { useToast } from "@/hooks/use-toast";

// OpenAI Whisper API interface
export interface WhisperTranscriptionResponse {
  text: string;
  segments?: {
    id: number;
    start: number;
    end: number;
    text: string;
    confidence: number;
  }[];
  language?: string;
}

// Get API key from localStorage if available
let OPENAI_API_KEY = localStorage.getItem("openai_api_key") || "";

export const setOpenAIKey = (key: string) => {
  OPENAI_API_KEY = key;
};

export const useWhisperService = () => {
  const { toast } = useToast();

  const transcribeAudio = async (
    audioBlob: Blob
  ): Promise<WhisperTranscriptionResponse | null> => {
    if (!OPENAI_API_KEY) {
      toast({
        title: "API Key Missing",
        description: "Please set your OpenAI API key in settings",
        variant: "destructive",
      });
      return null;
    }

    try {
      const formData = new FormData();
      formData.append("file", audioBlob, "recording.webm");
      formData.append("model", "whisper-1");
      formData.append("response_format", "verbose_json");
      
      const response = await fetch(
        "https://api.openai.com/v1/audio/transcriptions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${OPENAI_API_KEY}`,
          },
          body: formData,
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || "Failed to transcribe audio");
      }

      return await response.json();
    } catch (error) {
      console.error("Whisper transcription error:", error);
      toast({
        title: "Transcription Failed",
        description: error instanceof Error ? error.message : String(error),
        variant: "destructive",
      });
      return null;
    }
  };

  return {
    transcribeAudio
  };
};
