
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from "@/integrations/supabase/client";

export interface WhisperTranscriptionResponse {
  id: string;
  text: string;
  segments: any[];
  language: string;
  duration?: number;
  speakerName?: string;
  callScore?: number;
}

export interface TranscriptSegment {
  id: number;
  start: number;
  end: number;
  text: string;
  speaker: string;
}

export interface StoredTranscription {
  id: string;
  text: string;
  date: string;
  duration?: number;
  speakerName?: string;
  callScore?: number;
  sentiment?: string;
  transcript_segments?: TranscriptSegment[];
  keywords?: string[];
  filename?: string;
}

// Settings storage
let useLocalWhisperSetting = false;
let numSpeakers = 2; // Default to 2 speakers

export const setOpenAIKey = (key: string) => {
  localStorage.setItem("openai_api_key", key);
};

export const getStoredTranscriptions = (): StoredTranscription[] => {
  try {
    const transcriptions = localStorage.getItem('transcriptions');
    return transcriptions ? JSON.parse(transcriptions) : [];
  } catch (error) {
    console.error('Error retrieving transcriptions:', error);
    return [];
  }
};

export const useWhisperService = () => {
  const transcribeAudio = async (audioFile: File): Promise<WhisperTranscriptionResponse | null> => {
    try {
      // Get the OpenAI API key from localStorage
      const apiKey = localStorage.getItem("openai_api_key");
      if (!apiKey && !useLocalWhisperSetting) {
        console.error('OpenAI API key not found');
        return null;
      }
      
      // Format data for OpenAI API
      const formData = new FormData();
      formData.append('file', audioFile);
      formData.append('model', 'whisper-1');
      formData.append('response_format', 'json');
      if (numSpeakers > 1) {
        formData.append('speakers', numSpeakers.toString());
      }
      
      // Make request to OpenAI API through our proxy
      const response = await fetch('/api/transcribe', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
        body: formData,
      });
      
      if (!response.ok) {
        console.error('Transcription failed:', response.statusText);
        return null;
      }
      
      const data = await response.json();
      
      if (!data || !data.text) {
        console.error('Invalid transcription response:', data);
        return null;
      }
      
      // Create our response format
      const transcription: WhisperTranscriptionResponse = {
        id: uuidv4(),
        text: data.text,
        segments: data.segments || [],
        language: data.language || 'en',
        duration: audioFile.size / 16000 // Rough estimate of duration based on file size
      };
      
      // Store the transcription in local storage
      storeTranscription(transcription);
      
      return transcription;
    } catch (error) {
      console.error('Error transcribing audio:', error);
      return null;
    }
  };
  
  const storeTranscription = (transcription: WhisperTranscriptionResponse) => {
    try {
      const storedTranscriptions = getStoredTranscriptions();
      
      const newTranscription: StoredTranscription = {
        id: transcription.id,
        text: transcription.text,
        date: new Date().toISOString(),
        duration: transcription.duration,
        speakerName: "Unknown Speaker",
        callScore: 75,
        sentiment: "neutral",
        keywords: []
      };
      
      localStorage.setItem('transcriptions', JSON.stringify([...storedTranscriptions, newTranscription]));
    } catch (error) {
      console.error('Error storing transcription:', error);
    }
  };
  
  const forceRefreshTranscriptions = () => {
    // Dispatch a custom event to signal that transcriptions have been updated
    const event = new Event('transcriptions-updated');
    window.dispatchEvent(event);
  };

  const setUseLocalWhisper = (value: boolean) => {
    useLocalWhisperSetting = value;
    localStorage.setItem('use_local_whisper', value ? 'true' : 'false');
  };

  const getUseLocalWhisper = () => {
    const storedValue = localStorage.getItem('use_local_whisper');
    return storedValue ? storedValue === 'true' : useLocalWhisperSetting;
  };

  const setNumSpeakers = (value: number) => {
    numSpeakers = value;
    localStorage.setItem('num_speakers', value.toString());
  };

  const getNumSpeakers = () => {
    const storedValue = localStorage.getItem('num_speakers');
    return storedValue ? parseInt(storedValue, 10) : numSpeakers;
  };

  const saveTranscriptionWithAnalysis = async (text: string, audioFile?: File, fileName?: string) => {
    const transcriptionId = uuidv4();
    const now = new Date().toISOString();
    
    const duration = audioFile ? 120 : Math.floor(text.length / 20); // Estimate duration if not provided
    
    const newTranscription: StoredTranscription = {
      id: transcriptionId,
      text: text,
      date: now,
      duration: duration,
      speakerName: fileName || "Unknown Speaker",
      callScore: Math.floor(Math.random() * 30) + 70, // Random score between 70-100
      sentiment: Math.random() > 0.7 ? "positive" : Math.random() > 0.4 ? "neutral" : "negative",
      keywords: getKeywordsFromText(text),
      filename: fileName
    };
    
    // Store locally
    const existingTranscriptions = getStoredTranscriptions();
    localStorage.setItem('transcriptions', JSON.stringify([...existingTranscriptions, newTranscription]));
    
    // Save to Supabase
    try {
      await supabase.from('call_transcripts').insert({
        text: text,
        duration: duration,
        filename: fileName || "Manual Transcript",
        sentiment: newTranscription.sentiment,
        keywords: newTranscription.keywords,
        call_score: newTranscription.callScore,
        created_at: now
      });
    } catch (error) {
      console.error("Error saving to Supabase:", error);
    }
    
    // Force refresh UI
    forceRefreshTranscriptions();
    
    return newTranscription;
  };

  const getKeywordsFromText = (text: string): string[] => {
    const keywords = [];
    const lowercaseText = text.toLowerCase();
    
    // Check for business-related keywords
    if (lowercaseText.includes('price') || lowercaseText.includes('cost') || lowercaseText.includes('pricing')) {
      keywords.push('pricing');
    }
    
    if (lowercaseText.includes('competitor') || lowercaseText.includes('competition')) {
      keywords.push('competitors');
    }
    
    if (lowercaseText.includes('feature') || lowercaseText.includes('capability')) {
      keywords.push('features');
    }
    
    if (lowercaseText.includes('timeline') || lowercaseText.includes('deadline')) {
      keywords.push('timeline');
    }
    
    if (lowercaseText.includes('meeting') || lowercaseText.includes('schedule')) {
      keywords.push('scheduling');
    }
    
    if (lowercaseText.includes('contract') || lowercaseText.includes('agreement')) {
      keywords.push('contract');
    }
    
    return keywords;
  };

  const startRealtimeTranscription = async (
    onTranscriptUpdate: (transcript: string) => void,
    onError: (error: string) => void
  ): Promise<{ stop: () => void }> => {
    let mediaRecorder: MediaRecorder | null = null;
    let audioChunks: Blob[] = [];
    let currentTranscript = '';
    let processingChunk = false;
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder = new MediaRecorder(stream);
      
      mediaRecorder.onstart = () => {
        audioChunks = [];
        currentTranscript = '';
      };
      
      mediaRecorder.ondataavailable = async (e) => {
        if (e.data.size > 0) {
          audioChunks.push(e.data);
          
          // Process chunks periodically
          if (!processingChunk && audioChunks.length > 0) {
            processingChunk = true;
            
            try {
              const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
              // Convert Blob to File for compatibility
              const fakeFile = new File([audioBlob], "recording.webm", { type: 'audio/webm', lastModified: Date.now() });
              
              const result = await transcribeAudio(fakeFile);
              
              if (result) {
                currentTranscript = result.text;
                onTranscriptUpdate(currentTranscript);
              }
            } catch (error) {
              console.error('Error processing audio chunk:', error);
              onError('Error processing audio');
            } finally {
              processingChunk = false;
            }
          }
        }
      };
      
      mediaRecorder.onstop = () => {
        if (stream.getTracks) {
          stream.getTracks().forEach(track => track.stop());
        }
      };
      
      mediaRecorder.start(10000); // Capture in 10-second intervals
      
      return {
        stop: () => {
          if (mediaRecorder && mediaRecorder.state !== 'inactive') {
            mediaRecorder.stop();
          }
        }
      };
    } catch (error) {
      console.error('Error starting real-time transcription:', error);
      onError('Could not access microphone');
      throw error;
    }
  };
  
  return {
    transcribeAudio,
    getStoredTranscriptions,
    forceRefreshTranscriptions,
    getNumSpeakers,
    setNumSpeakers,
    getUseLocalWhisper,
    setUseLocalWhisper,
    saveTranscriptionWithAnalysis,
    setOpenAIKey,
    startRealtimeTranscription
  };
};
