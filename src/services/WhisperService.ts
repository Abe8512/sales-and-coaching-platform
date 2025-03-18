
import { useToast } from "@/hooks/use-toast";
import { pipeline } from "@huggingface/transformers";

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
  // New fields for better speaker diarization
  transcript_segments?: TranscriptSegment[];
}

// Inspired by the example's TranscriptSegment format
export interface TranscriptSegment {
  id: number;
  start: number;
  end: number;
  text: string;
  speaker: string;  // "Agent" or "Customer"
  confidence: number;
}

// Get API key from localStorage if available
let OPENAI_API_KEY = localStorage.getItem("openai_api_key") || "";
let useLocalWhisper = localStorage.getItem("use_local_whisper") === "true";
let numSpeakers = Number(localStorage.getItem("num_speakers")) || 2;

export const setOpenAIKey = (key: string) => {
  OPENAI_API_KEY = key;
  localStorage.setItem("openai_api_key", key);
};

export const setUseLocalWhisper = (value: boolean) => {
  useLocalWhisper = value;
  localStorage.setItem("use_local_whisper", value.toString());
};

export const getUseLocalWhisper = (): boolean => {
  return useLocalWhisper;
};

export const setNumSpeakers = (value: number) => {
  numSpeakers = value;
  localStorage.setItem("num_speakers", value.toString());
};

export const getNumSpeakers = (): number => {
  return numSpeakers;
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

// Cache for the Whisper model to avoid reloading
let whisperModel: any = null;

// Function to load the local Whisper model
const loadWhisperModel = async () => {
  if (!whisperModel) {
    try {
      whisperModel = await pipeline(
        "automatic-speech-recognition",
        "distil-whisper/distil-small.en", // Smaller model for browser use
        { 
          device: "wasm"  // Use WASM as default device for browser compatibility
        }
      );
    } catch (error) {
      console.error("Error loading Whisper model:", error);
      throw new Error("Failed to load Whisper model");
    }
  }
  return whisperModel;
};

// New function to split transcript into segments by speaker
const splitBySpeaker = (result: WhisperTranscriptionResponse, numberOfSpeakers: number = 2): TranscriptSegment[] => {
  if (!result.segments || result.segments.length === 0) {
    // If no segments, create a single segment with the full text
    return [{
      id: 1,
      start: 0,
      end: 30, // Arbitrary end time if not known
      text: result.text,
      speaker: "Agent", // Default to Agent
      confidence: 0.9
    }];
  }
  
  // Simple algorithm to alternate speakers
  // In a real app, you'd use a proper diarization model
  const segments: TranscriptSegment[] = result.segments.map((segment, index) => {
    // Simple alternating pattern for agent/customer
    // For more than 2 speakers, you'd need a more complex approach
    const speakerIndex = index % numberOfSpeakers;
    const speaker = speakerIndex === 0 ? "Agent" : "Customer";
    
    return {
      id: segment.id,
      start: segment.start,
      end: segment.end,
      text: segment.text,
      speaker,
      confidence: segment.confidence
    };
  });
  
  return segments;
};

export const useWhisperService = () => {
  const { toast } = useToast();

  // Transcribe using the OpenAI Whisper API
  const transcribeWithAPI = async (audioBlob: Blob): Promise<WhisperTranscriptionResponse | null> => {
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
      console.error("Whisper API transcription error:", error);
      toast({
        title: "Transcription Failed",
        description: error instanceof Error ? error.message : String(error),
        variant: "destructive",
      });
      return null;
    }
  };

  // Transcribe using the local Whisper model
  const transcribeLocally = async (audioBlob: Blob): Promise<WhisperTranscriptionResponse | null> => {
    try {
      toast({
        title: "Loading Model",
        description: "Preparing local Whisper model...",
      });
      
      // Load the model
      const model = await loadWhisperModel();
      
      toast({
        title: "Transcribing",
        description: "Processing audio locally...",
      });
      
      // Convert blob to a format accepted by the model
      const audioUrl = URL.createObjectURL(audioBlob);
      
      // Perform transcription
      const result = await model(audioUrl, {
        chunk_length_s: 30, // Process in 30-second chunks
        stride_length_s: 5,  // 5-second overlap between chunks
        return_timestamps: true,
      });
      
      // Clean up URL
      URL.revokeObjectURL(audioUrl);
      
      toast({
        title: "Transcription Complete",
        description: "Audio has been successfully transcribed locally",
      });
      
      // Format to match our expected response format
      const response: WhisperTranscriptionResponse = {
        text: result.text,
        segments: result.chunks?.map((chunk: any, i: number) => ({
          id: i,
          start: chunk.timestamp[0],
          end: chunk.timestamp[1],
          text: chunk.text,
          confidence: 0.9, // Local model doesn't provide confidence, use placeholder
        })) || [],
        language: 'en', // Assume English for local model
      };
      
      return response;
    } catch (error) {
      console.error("Local Whisper transcription error:", error);
      toast({
        title: "Local Transcription Failed",
        description: "Falling back to API transcription...",
        variant: "destructive",
      });
      
      // Try the API as fallback
      if (OPENAI_API_KEY) {
        return transcribeWithAPI(audioBlob);
      }
      return null;
    }
  };

  const transcribeAudio = async (
    audioBlob: Blob
  ): Promise<WhisperTranscriptionResponse | null> => {
    // Decide whether to use local or API transcription
    if (useLocalWhisper) {
      const result = await transcribeLocally(audioBlob);
      if (result) return result;
      
      // If local transcription fails and we have an API key, fall back to API
      if (OPENAI_API_KEY) {
        toast({
          title: "Falling Back to API",
          description: "Local transcription failed, using OpenAI API instead",
        });
        return transcribeWithAPI(audioBlob);
      }
      return null;
    } else {
      // Use the OpenAI API
      return transcribeWithAPI(audioBlob);
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

  // New function for real-time transcription inspired by the example
  const startRealtimeTranscription = async (
    onTranscriptUpdate: (text: string) => void,
    onError: (error: string) => void
  ) => {
    // Check if browser supports Web Audio API
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      onError("Your browser doesn't support audio recording");
      return { stop: () => {} };
    }

    try {
      // Get audio stream
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      let mediaRecorder: MediaRecorder | null = null;
      let audioChunks: Blob[] = [];
      let isProcessing = false;
      
      // Create a MediaRecorder to capture audio
      mediaRecorder = new MediaRecorder(stream);
      
      // Process audio in chunks
      mediaRecorder.ondataavailable = async (event) => {
        if (event.data.size > 0) {
          audioChunks.push(event.data);
          
          // Process audio if we're not already processing
          if (!isProcessing && audioChunks.length > 0) {
            isProcessing = true;
            
            // Create a blob from all accumulated chunks
            const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
            
            try {
              // Use either local or API-based transcription
              let result: WhisperTranscriptionResponse | null;
              
              if (useLocalWhisper) {
                // We'll use a simpler approach for real-time with the local model
                const model = await loadWhisperModel();
                const audioUrl = URL.createObjectURL(audioBlob);
                const modelResult = await model(audioUrl);
                URL.revokeObjectURL(audioUrl);
                
                result = {
                  text: modelResult.text,
                  language: 'en'
                };
              } else {
                // Use the API
                result = await transcribeWithAPI(audioBlob);
              }
              
              if (result && result.text) {
                onTranscriptUpdate(result.text);
              }
            } catch (error) {
              console.error("Real-time transcription error:", error);
              onError(error instanceof Error ? error.message : "Transcription failed");
            } finally {
              isProcessing = false;
            }
          }
        }
      };
      
      // Start recording
      mediaRecorder.start(10000); // Collect 10 seconds of audio at a time
      
      // Return an object with a method to stop the recording
      return {
        stop: () => {
          if (mediaRecorder && mediaRecorder.state !== 'inactive') {
            mediaRecorder.stop();
            stream.getTracks().forEach(track => track.stop());
          }
        }
      };
    } catch (error) {
      console.error("Error starting real-time transcription:", error);
      onError(error instanceof Error ? error.message : "Failed to start recording");
      return { stop: () => {} };
    }
  };

  // New function to analyze call from a URL (inspired by the example)
  const analyzeCallFromUrl = async (url: string): Promise<StoredTranscription | null> => {
    try {
      toast({
        title: "Fetching Audio",
        description: "Downloading audio file from URL...",
      });
      
      // Fetch the audio file
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch audio file: ${response.statusText}`);
      }
      
      const audioBlob = await response.blob();
      
      // Extract filename from URL
      const urlParts = url.split('/');
      const filename = urlParts[urlParts.length - 1] || "recording.wav";
      
      // Transcribe the audio
      const result = await transcribeAudio(audioBlob);
      
      if (!result) {
        throw new Error("Transcription failed");
      }
      
      // Process the transcription into segments by speaker
      const transcriptSegments = splitBySpeaker(result, numSpeakers);
      
      // Save the transcription with analysis
      const transcription = await saveTranscriptionWithAnalysis(result.text, audioBlob, filename);
      
      // Add the transcript segments
      transcription.transcript_segments = transcriptSegments;
      
      // Update in storage
      const transcriptions = getStoredTranscriptions();
      const index = transcriptions.findIndex(t => t.id === transcription.id);
      if (index >= 0) {
        transcriptions[index] = transcription;
        localStorage.setItem('transcriptions', JSON.stringify(transcriptions));
      }
      
      return transcription;
    } catch (error) {
      console.error("Error analyzing call from URL:", error);
      toast({
        title: "Analysis Failed",
        description: error instanceof Error ? error.message : "Failed to analyze call",
        variant: "destructive",
      });
      return null;
    }
  };

  // Enhanced saveTranscriptionWithAnalysis to include segments
  const saveTranscriptionWithFullAnalysis = async (
    result: WhisperTranscriptionResponse, 
    audioBlob?: Blob, 
    filename?: string
  ): Promise<StoredTranscription> => {
    const text = result.text;
    const id = crypto.randomUUID();
    const sentiment = analyzeSentiment(text);
    const keywords = extractKeywords(text);
    const callScore = generateCallScore(text);
    
    // Calculate duration if audioBlob is provided
    let duration: number | undefined;
    if (audioBlob) {
      duration = await calculateAudioDuration(audioBlob);
    }
    
    // Generate transcript segments with speaker diarization
    const transcriptSegments = splitBySpeaker(result, numSpeakers);
    
    const transcription: StoredTranscription = {
      id,
      text,
      filename,
      date: new Date().toISOString(),
      duration,
      sentiment,
      keywords,
      callScore,
      transcript_segments: transcriptSegments
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
    saveTranscriptionWithFullAnalysis,
    getStoredTranscriptions,
    setOpenAIKey,
    setUseLocalWhisper,
    getUseLocalWhisper,
    setNumSpeakers,
    getNumSpeakers,
    startRealtimeTranscription,
    analyzeCallFromUrl
  };
};
