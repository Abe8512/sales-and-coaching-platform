
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

export interface StoredTranscription {
  id: string;
  text: string;
  filename?: string;
  date: string;
  duration?: number;
  speakerName?: string;
  callScore?: number;
  sentiment?: 'positive' | 'neutral' | 'negative';
  keywords?: string[];
}

// Get API key from localStorage if available
let OPENAI_API_KEY = localStorage.getItem("openai_api_key") || "";

export const setOpenAIKey = (key: string) => {
  OPENAI_API_KEY = key;
  localStorage.setItem("openai_api_key", key);
};

// Utility function to get all stored transcriptions
export const getStoredTranscriptions = (): StoredTranscription[] => {
  const stored = localStorage.getItem('transcriptions');
  return stored ? JSON.parse(stored) : [];
};

// Utility function to save a transcription
export const saveTranscription = (transcription: StoredTranscription): void => {
  const transcriptions = getStoredTranscriptions();
  transcriptions.push(transcription);
  localStorage.setItem('transcriptions', JSON.stringify(transcriptions));
};

// Utility to analyze text and generate a sentiment score
const analyzeSentiment = (text: string): 'positive' | 'neutral' | 'negative' => {
  const positiveWords = ['great', 'good', 'excellent', 'happy', 'pleased', 'thank', 'appreciate', 'yes', 'perfect', 'love'];
  const negativeWords = ['bad', 'terrible', 'unhappy', 'disappointed', 'issue', 'problem', 'no', 'not', 'cannot', 'wrong'];
  
  const lowerText = text.toLowerCase();
  let positiveScore = 0;
  let negativeScore = 0;
  
  positiveWords.forEach(word => {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    const matches = lowerText.match(regex);
    if (matches) positiveScore += matches.length;
  });
  
  negativeWords.forEach(word => {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    const matches = lowerText.match(regex);
    if (matches) negativeScore += matches.length;
  });
  
  if (positiveScore > negativeScore * 1.5) return 'positive';
  if (negativeScore > positiveScore * 1.5) return 'negative';
  return 'neutral';
};

// Utility to extract keywords from text
const extractKeywords = (text: string): string[] => {
  const stopWords = ['a', 'an', 'the', 'and', 'or', 'but', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'in', 'on', 'at', 'to', 'for', 'with', 'by', 'about', 'of', 'that', 'this', 'these', 'those'];
  const words = text.toLowerCase().match(/\b(\w+)\b/g) || [];
  const wordFrequency: Record<string, number> = {};
  
  words.forEach(word => {
    if (!stopWords.includes(word) && word.length > 2) {
      wordFrequency[word] = (wordFrequency[word] || 0) + 1;
    }
  });
  
  return Object.entries(wordFrequency)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(entry => entry[0]);
};

// Generate a call score based on various metrics
const generateCallScore = (text: string): number => {
  // Base score
  let score = 70;
  
  const sentiment = analyzeSentiment(text);
  if (sentiment === 'positive') score += 15;
  if (sentiment === 'negative') score -= 10;
  
  // Check for customer service phrases
  const goodPhrases = [
    'how can i help', 
    'thank you', 
    'appreciate', 
    'understand', 
    'let me explain',
    'would you like'
  ];
  
  goodPhrases.forEach(phrase => {
    if (text.toLowerCase().includes(phrase)) score += 2;
  });
  
  // Add some randomness (within 5 points)
  score += Math.floor(Math.random() * 10) - 5;
  
  // Ensure score is between 0-100
  return Math.max(0, Math.min(100, score));
};

// Calculate audio duration in seconds based on audio file
const calculateAudioDuration = async (audioBlob: Blob): Promise<number> => {
  return new Promise((resolve) => {
    const audioUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(audioUrl);
    
    audio.addEventListener('loadedmetadata', () => {
      const duration = audio.duration;
      URL.revokeObjectURL(audioUrl);
      resolve(Math.round(duration));
    });
    
    // Fallback if metadata doesn't load properly
    audio.addEventListener('error', () => {
      URL.revokeObjectURL(audioUrl);
      // Estimate duration based on file size (very rough approximation)
      // Assuming 16bit 16kHz mono audio (~32kB per second)
      const estimatedSeconds = Math.round(audioBlob.size / 32000);
      resolve(estimatedSeconds > 0 ? estimatedSeconds : 60); // Default to 60 seconds if calculation fails
    });
  });
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
      
      toast({
        title: "Transcribing",
        description: "Processing audio with Whisper API...",
      });
      
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

      const result = await response.json();
      
      toast({
        title: "Transcription Complete",
        description: "Audio has been successfully transcribed",
      });
      
      return result;
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

  const saveTranscriptionWithAnalysis = async (text: string, audioBlob?: Blob, filename?: string): Promise<StoredTranscription> => {
    const id = crypto.randomUUID();
    const sentiment = analyzeSentiment(text);
    const keywords = extractKeywords(text);
    const callScore = generateCallScore(text);
    
    // Calculate duration if audioBlob is provided
    let duration: number | undefined;
    if (audioBlob) {
      duration = await calculateAudioDuration(audioBlob);
    }
    
    const transcription: StoredTranscription = {
      id,
      text,
      filename,
      date: new Date().toISOString(),
      duration,
      sentiment,
      keywords,
      callScore
    };
    
    saveTranscription(transcription);
    
    toast({
      title: "Analysis Complete",
      description: "Transcription and analysis have been saved",
    });
    
    return transcription;
  };

  return {
    transcribeAudio,
    saveTranscriptionWithAnalysis,
    getStoredTranscriptions,
    setOpenAIKey
  };
};
