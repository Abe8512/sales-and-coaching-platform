import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface WhisperTranscriptionResponse {
  id: string;
  text: string;
  segments: any[];
  language: string;
  duration?: number;
  speakerName?: string;
  callScore?: number;
}

export interface StoredTranscription {
  id: string;
  text: string;
  date: string;
  duration?: number;
  speakerName?: string;
  callScore?: number;
  sentiment?: string;
}

export const useWhisperService = () => {
  const numSpeakers = 2; // Default to 2 speakers
  
  const transcribeAudio = async (audioFile: File): Promise<WhisperTranscriptionResponse | null> => {
    try {
      const arrayBuffer = await audioFile.arrayBuffer();
      const base64Audio = Buffer.from(arrayBuffer).toString('base64');
      
      const response = await fetch('/api/transcribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ audio: base64Audio, numSpeakers }),
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
      
      const transcription: WhisperTranscriptionResponse = {
        id: uuidv4(),
        text: data.text,
        segments: data.segments,
        language: data.language,
        duration: data.duration
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
        sentiment: "neutral"
      };
      
      localStorage.setItem('transcriptions', JSON.stringify([...storedTranscriptions, newTranscription]));
    } catch (error) {
      console.error('Error storing transcription:', error);
    }
  };
  
  const getStoredTranscriptions = (): StoredTranscription[] => {
    try {
      const transcriptions = localStorage.getItem('transcriptions');
      return transcriptions ? JSON.parse(transcriptions) : [];
    } catch (error) {
      console.error('Error retrieving transcriptions:', error);
      return [];
    }
  };
  
  const forceRefreshTranscriptions = () => {
    // Dispatch a custom event to signal that transcriptions have been updated
    const event = new Event('transcriptions-updated');
    window.dispatchEvent(event);
  };
  
  return {
    transcribeAudio,
    getStoredTranscriptions,
    forceRefreshTranscriptions,
    getNumSpeakers: () => numSpeakers,
  };
};
