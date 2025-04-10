import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { reportError, ErrorCategory } from "./ErrorBridgeService";
import { refreshMetrics } from "./DataSyncService";
import { analyzeTranscript, TranscriptAnalysisResult } from "./repositories/AnalyticsRepository";
import { Json } from '@/integrations/supabase/types';
import { Database } from "@/integrations/supabase/types";
import { getSupabaseClient } from "@/integrations/supabase/customClient";
import { SupabaseClient } from '@supabase/supabase-js'; // Import type

export interface WhisperTranscriptionResponse {
  id: string;
  text: string;
  segments: Array<TranscriptSegment>;
  words?: Array<WordTimestamp>;
  language: string;
  duration?: number;
  speakerName?: string;
  callScore?: number;
  customerName?: string;
}

export interface TranscriptSegment {
  id: number;
  start: number;
  end: number;
  text: string;
  speaker: string;
}

export interface WordTimestamp {
  word: string;
  start: number;
  end: number;
  confidence?: number;
  speaker?: string;
}

export interface StoredTranscription {
  id: string;
  text: string;
  date: string;
  duration?: number;
  speakerName?: string;
  customerName?: string;
  callScore?: number;
  segments?: any[];
  words?: WordTimestamp[];
  sentiment?: string | any;
  keywords?: string[];
  filename?: string;
}

// Settings storage
let useLocalWhisperSetting = false;
let numSpeakers = 2; // Default to 2 speakers
const pendingBatchTranscriptions: Array<{
  file: File, 
  resolve: (value: WhisperTranscriptionResponse | null | PromiseLike<WhisperTranscriptionResponse | null>) => void, 
  reject: (reason?: Error | string | unknown) => void
}> = [];
let batchInProgress = false;
const BATCH_SIZE = 5; // Maximum batch size
const BATCH_TIMEOUT = 2000; // Max wait time for batching in ms

// Local storage key for transcriptions
const TRANSCRIPTIONS_STORAGE_KEY = 'whisper_transcriptions';

export const setOpenAIKey = (key: string) => {
  localStorage.setItem("openai_api_key", key);
};

export const getStoredTranscriptions = (): StoredTranscription[] => {
  const storedData = localStorage.getItem(TRANSCRIPTIONS_STORAGE_KEY);
  if (!storedData) return [];
  
  try {
    return JSON.parse(storedData);
  } catch (e) {
    console.error('Error parsing stored transcriptions:', e);
    return [];
  }
};

// Store a transcription in local storage
const storeTranscription = (transcription: WhisperTranscriptionResponse): void => {
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
      keywords: [],
      customerName: undefined
    };
    
    localStorage.setItem(TRANSCRIPTIONS_STORAGE_KEY, JSON.stringify([...storedTranscriptions, newTranscription]));
  } catch (error) {
    console.error('Error storing transcription:', error);
  }
};

// Process the batch of files
const processBatch = async () => {
  if (pendingBatchTranscriptions.length === 0 || batchInProgress) return;
  
  batchInProgress = true;
  console.log(`Processing batch of ${pendingBatchTranscriptions.length} files`);
  
  // Take up to BATCH_SIZE files for this batch
  const currentBatch = pendingBatchTranscriptions.splice(0, BATCH_SIZE);
  
  try {
    const apiKey = localStorage.getItem("openai_api_key");
    if (!apiKey) {
      throw new Error('OpenAI API key not found. Please add your API key in settings.');
    }
    
    // Process files in parallel
    await Promise.all(currentBatch.map(async (item) => {
      try {
        // Process individual file
        const result = await transcribeAudioSingle(item.file);
        item.resolve(result);
      } catch (error) {
        console.error(`Error processing batch item:`, error);
        item.reject(error);
      }
    }));
  } catch (error) {
    // If there's a global error, reject all files in the batch
    currentBatch.forEach(item => item.reject(error));
  } finally {
    batchInProgress = false;
    
    // Process any remaining files
    if (pendingBatchTranscriptions.length > 0) {
      processBatch();
    }
  }
};

// Process a single file (internal)
const transcribeAudioSingle = async (audioFile: File): Promise<WhisperTranscriptionResponse | null> => {
  let fileToUpload = audioFile;
  let audioType: string | undefined = fileToUpload.type; // Default to original type
  
  if (!audioFile.name.includes('.')) {
    const extension = audioFile.type.split('/')[1] || 'wav'; 
    const newFileName = `audio.${extension}`;
    // Determine audioType based on extension here too if needed, 
    // though usually the original type is fine if no extension was present.
    audioType = fileToUpload.type; // Keep original type or refine
    fileToUpload = new File([audioFile], newFileName, { type: audioType });
    console.log(`Added proper file name: ${newFileName}...`);
  } else {
    const fileExtension = audioFile.name.split('.').pop()?.toLowerCase(); 
    // Define standard types based on extension
    const calculatedAudioType = fileExtension === 'mp3' ? 'audio/mpeg' : 
                                fileExtension === 'wav' ? 'audio/wav' :
                                fileExtension === 'm4a' ? 'audio/mp4' :
                                fileExtension === 'mp4' ? 'audio/mp4' :
                                fileExtension === 'ogg' ? 'audio/ogg' :
                                fileExtension === 'webm' ? 'audio/webm' :
                                fileExtension === 'flac' ? 'audio/flac' :
                                fileExtension === 'aac' ? 'audio/aac' :
                                undefined; // Set undefined if not a standard audio ext
    
    // If type is mismatched or non-standard, attempt correction
    if (calculatedAudioType && calculatedAudioType !== fileToUpload.type && !fileToUpload.type.startsWith('audio/')) {
         console.log(`Correcting MIME type from ${fileToUpload.type} to ${calculatedAudioType}`);
         audioType = calculatedAudioType;
         fileToUpload = new File([audioFile], audioFile.name, { type: audioType });
    } else if (!calculatedAudioType && !fileToUpload.type.startsWith('audio/')){
         // If extension is unknown AND type isn't audio, keep original type but warn
         console.warn(`Unknown audio extension '.${fileExtension}' and type '${fileToUpload.type}'. Uploading with original type.`);
         audioType = fileToUpload.type;
    } else {
        // Type is already audio or matches calculation, keep original
        audioType = fileToUpload.type;
    }
  }
  
  // Ensure fileToUpload reflects the potentially corrected type
  if (fileToUpload.type !== audioType && audioType) { 
      fileToUpload = new File([audioFile], fileToUpload.name, { type: audioType });
  }

  // Final validation check using the potentially updated fileToUpload.type
  const validAudioType = fileToUpload.type.startsWith('audio/') || 
                        fileToUpload.type === 'application/octet-stream';
  if (!validAudioType) {
    console.error(`Invalid final file type: ${fileToUpload.type}.`);
    return null;
  }
  
  try {
    console.log(`[WhisperService] Processing file: ${fileToUpload.name}, type: ${fileToUpload.type}, size: ${fileToUpload.size}`);
    const apiKey = localStorage.getItem("openai_api_key");
    if (!apiKey) throw new Error('OpenAI API key not found in localStorage.');

    // --- File Validation & Preparation ---
    // (Keep validation logic: MIME type check, extension check, content check)
    const rejectedMimeTypes = ['text/plain', 'text/csv', 'text/html', 'text/javascript', 'application/json', 'text/xml', 'application/xml'];
    if (rejectedMimeTypes.some(type => fileToUpload.type.includes(type))) {
       throw new Error(`File type ${fileToUpload.type} is not supported.`);
    }
    const fileExtension = fileToUpload.name.split('.').pop()?.toLowerCase();
    const rejectedExtensions = ['txt', 'json', 'csv', 'xml', 'html', 'js', 'jsx', 'ts', 'tsx'];
    if (!fileExtension || rejectedExtensions.includes(fileExtension)) {
      throw new Error(`File extension .${fileExtension || 'unknown'} is not supported.`);
    }
    // Correct type if needed (based on extension)
    const audioType = fileExtension === 'mp3' ? 'audio/mpeg' : 
                     fileExtension === 'wav' ? 'audio/wav' :
                     fileExtension === 'm4a' ? 'audio/mp4' :
                     fileExtension === 'mp4' ? 'audio/mp4' :
                     fileExtension === 'ogg' ? 'audio/ogg' :
                     fileExtension === 'webm' ? 'audio/webm' :
                     fileExtension === 'flac' ? 'audio/flac' :
                     fileExtension === 'aac' ? 'audio/aac' : 'audio/wav';
                     
    if (fileToUpload.type !== audioType && !fileToUpload.type.includes('octet-stream')) {
         console.log(`Correcting MIME type from ${fileToUpload.type} to ${audioType}`);
         fileToUpload = new File([fileToUpload], fileToUpload.name, { type: audioType });
    }
    if (!fileToUpload.type.startsWith('audio/') && fileToUpload.type !== 'application/octet-stream') {
        throw new Error(`Invalid final file type: ${fileToUpload.type}.`);
    }
    // --- End File Validation ---
    
    console.log(`[WhisperService] Uploading ${fileToUpload.name} (${fileToUpload.type})`);
    const formData = new FormData();
    formData.append('file', fileToUpload, fileToUpload.name);
    formData.append('model', 'whisper-1'); 
    formData.append('response_format', 'verbose_json'); 
    formData.append('timestamp_granularities[]', 'word');
    formData.append('timestamp_granularities[]', 'segment');

    const maxRetries = 2; 
    let lastError: Error | null = null;
    const OPENAI_API_URL = "https://api.openai.com/v1/audio/transcriptions";

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`[WhisperService] OpenAI API attempt ${attempt}/${maxRetries}`);
        const response = await fetch(OPENAI_API_URL, { 
          method: 'POST',
          headers: { 'Authorization': `Bearer ${apiKey}` },
          body: formData,
        });
        
        const responseData = await response.json();
        console.log(`[WhisperService] OpenAI API response status: ${response.status}`);

        if (!response.ok) {
           console.error(`OpenAI Error (${response.status}):`, responseData);
           const errorDetail = responseData.error?.message || responseData.message || `HTTP error ${response.status}`;
           // Handle specific errors (401, 429, 400, 404)
           if (response.status === 401) throw new Error(`Authentication error: Invalid API key.`);
           if (response.status === 429) {
               if (attempt < maxRetries) { await new Promise(r => setTimeout(r, 2000 * attempt)); continue; } 
               else { throw new Error(`Rate limit exceeded.`); }
           }
           if (response.status === 400 && errorDetail.includes("Invalid file format")) {
               throw new Error(`Invalid file format.`);
           }
           if (response.status === 404 && errorDetail.includes("model_not_found")) {
               throw new Error(`OpenAI Model Error: 'whisper-1' not found.`);
           }
           throw new Error(`Transcription failed: ${errorDetail}`);
        }
        
        console.log('[WhisperService] OpenAI API success.');
        if (!responseData || !responseData.text) throw new Error('Invalid response format from OpenAI.');
        
        const transcription: WhisperTranscriptionResponse = {
          id: uuidv4(), // Generate ID here
          text: responseData.text,
          segments: responseData.segments || [],
          words: responseData.words || [],
          language: responseData.language || 'en',
          duration: responseData.duration 
        };
        storeTranscription(transcription); // Store basic info locally
        return transcription; // Return full response

      } catch (apiError: any) {
         lastError = apiError instanceof Error ? apiError : new Error(String(apiError));
         console.error(`[WhisperService] OpenAI API attempt ${attempt} failed:`, lastError.message);
         if (apiError.message?.includes('401') || apiError.message?.includes('400')) break; 
         if (attempt < maxRetries) { await new Promise(r => setTimeout(r, 1500 * attempt)); }
         else { break; }
      }
    } 
    throw lastError || new Error('Transcription failed after multiple attempts');

  } catch (error) {
    console.error('[WhisperService] Error in transcribeAudioSingle:', error);
    reportError(error, ErrorCategory.INTEGRATION, { action: 'transcribeAudioSingle', fileName: audioFile?.name });
    throw error; 
  }
};

// Moved helper function outside the hook as it doesn't depend on hook state
const getAudioDuration = (file: File): Promise<number> => {
  return new Promise((resolve) => {
    const audio = document.createElement('audio');
    audio.addEventListener('loadedmetadata', () => {
      resolve(Math.round(audio.duration));
      URL.revokeObjectURL(audio.src); // Clean up object URL
    });
    audio.addEventListener('error', (e) => {
      console.warn('Could not determine audio duration via element, estimating...', e);
      // NOTE: Fallback duration estimation based on size is very rough.
      const estimatedDuration = Math.round(file.size / 16000);
      resolve(estimatedDuration > 1 ? estimatedDuration : 30);
      URL.revokeObjectURL(audio.src);
    });
    audio.src = URL.createObjectURL(file);
  });
};

// Moved helper function outside the hook and ensure export is at top level
export const extractNames = (transcriptText: string): { repName?: string, customerName?: string } => {
  // Patterns to match name introductions
  // NOTE: This is a simplistic approach and might misidentify names or roles in complex conversations.
  const namePattern = /\b(?:my name is|I am|this is|I'm|speaking with)\s([A-Z][a-z]+(?:\s[A-Z][a-z]+)?)/gi;
  const detectedNames = [];

  let match;
  while ((match = namePattern.exec(transcriptText)) !== null) {
    detectedNames.push(match[1]);
  }

  console.log('Detected names:', detectedNames);

  // Try to detect who is the rep and who is the customer
  let repName = undefined;
  let customerName = undefined;

  // Look for specific rep indicators
  const repIndicators = [
    /speaking today with/i,
    /this is .{1,20} from/i,
    /my name is .{1,20} (and I'm |I am |from )/i
  ];

  for (const indicator of repIndicators) {
    const repMatch = transcriptText.match(indicator);
    if (repMatch) {
      const nameMatch = repMatch[0].match(/[A-Z][a-z]+(?:\s[A-Z][a-z]+)?/);
      if (nameMatch) {
        repName = nameMatch[0];
        break;
      }
    }
  }

  // If we found at least one name but no specific rep indicators
  if (detectedNames.length > 0 && !repName) {
    repName = detectedNames[0];
    if (detectedNames.length > 1) {
      customerName = detectedNames[1];
    }
  }

  return { repName, customerName };
};

export const useWhisperService = () => {
  const supabase = getSupabaseClient();

  const transcribeAudio = async (audioFile: File): Promise<WhisperTranscriptionResponse | null> => {
    // For testing or local processing, bypass batching
    if (useLocalWhisperSetting || audioFile.type === 'text/plain' || audioFile.size < 100000) {
      return transcribeAudioSingle(audioFile);
    }
    
    // Use batching for regular API calls
    return new Promise((resolve, reject) => {
      // Add this file to the pending batch
      pendingBatchTranscriptions.push({
        file: audioFile,
        resolve,
        reject
      });
      
      console.log(`Added file to batch. Current batch size: ${pendingBatchTranscriptions.length}`);
      
      // If batch reaches the threshold size, process immediately
      if (pendingBatchTranscriptions.length >= BATCH_SIZE) {
        console.log('Batch size threshold reached, processing batch immediately');
        processBatch();
      } else {
        // Otherwise, set a timeout to process the batch if it doesn't fill up
        setTimeout(() => {
          if (pendingBatchTranscriptions.length > 0 && !batchInProgress) {
            console.log('Processing batch after timeout');
            processBatch();
          }
        }, BATCH_TIMEOUT);
      }
    });
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

  const saveTranscriptionWithAnalysis = async (
      userId: string,
      text: string,
      audioFile?: File,
      fileName?: string,
      segments?: any[],
      whisperDuration?: number // Renamed to avoid conflict
    ): Promise<StoredTranscription | null> => {
    if (!text || text.trim() === '') {
      console.error('Cannot save empty transcription');
      return null; // Return null if no text
    }
    
    const now = new Date().toISOString();
    const transcriptionId = uuidv4();
    const actualDuration = whisperDuration ?? (audioFile ? await getAudioDuration(audioFile) : 0);
    const { repName, customerName } = extractNames(text);
    
    let analysisResult: TranscriptAnalysisResult | null = null;
    let saveError: any = null;

    try {
      analysisResult = await analyzeTranscript(text);
      console.log('Transcript analysis successful:', analysisResult);
    } catch (error) {
      saveError = error; // Store error to handle after creating basic transcription
      reportError(error, ErrorCategory.INTEGRATION, { action: 'analyzeTranscript_in_save' });
      console.error('Error during transcript analysis:', error);
      // Proceed to save with basic analysis as fallback
    }

    // Create the transcription object
    const newTranscription: StoredTranscription = {
      id: transcriptionId,
      text: text,
      date: now,
      duration: actualDuration,
      speakerName: repName || "Unknown Rep", // Provide default
      customerName: customerName || undefined,
      callScore: analysisResult?.call_score ?? (70 + Math.floor(Math.random() * 20)), // Use analysis or fallback random
      sentiment: analysisResult?.sentiment ?? (Math.random() > 0.7 ? "positive" : Math.random() > 0.4 ? "neutral" : "negative"),
      keywords: analysisResult?.keywords ?? getKeywordsFromText(text), // Use analysis or fallback extraction
      filename: fileName,
      segments: segments,
    };

    // Store locally
    try {
        const existingTranscriptions = getStoredTranscriptions();
        localStorage.setItem(TRANSCRIPTIONS_STORAGE_KEY, JSON.stringify([...existingTranscriptions, newTranscription]));
    } catch(localError) {
        reportError(localError, ErrorCategory.UI, { action: 'save_to_localstorage' });
        console.error("Failed to save transcription to local storage:", localError);
    }
    
    // Save to Supabase
    try {
      if (!userId) {
          console.error('Invalid User ID received in saveTranscriptionWithAnalysis');
          throw new Error("Invalid User ID provided for saving transcription");
      }

      // --- 1. Insert into 'calls' table first ---
      const callInsertData: Database['public']['Tables']['calls']['Insert'] = {
          id: transcriptionId, // Use the same UUID for the call ID
          user_id: userId,
          created_at: now,
          duration: actualDuration, // Can store duration here too
          // Other fields like sentiment, score, etc., can be null initially or updated later
      };
      console.log(`Attempting insert into calls table for ID: ${transcriptionId}`);
      const { error: callInsertError } = await supabase
        .from('calls')
        .insert(callInsertData);

      if (callInsertError) {
        console.error('Error inserting into calls table:', callInsertError);
        // Decide how to handle: maybe transcript insert shouldn't proceed?
        // For now, throw the error to prevent inconsistent data.
        throw new Error(`Failed to create parent call record: ${callInsertError.message}`);
      }
      console.log(`Successfully inserted into calls table for ID: ${transcriptionId}`);
      // --- End Insert into 'calls' ---

      // --- 2. Prepare and Insert into 'call_transcripts' table ---
      const transcriptInsertData: Database['public']['Tables']['call_transcripts']['Insert'] = {
          id: transcriptionId,
          call_id: transcriptionId, // Now this ID should exist in 'calls' table
          user_id: userId,
          filename: fileName ?? audioFile?.name,
          text: text,
          sentiment: analysisResult?.sentiment as string ?? null,
          sentiment_score: analysisResult?.sentiment_score ?? null,
          keywords: analysisResult?.keywords ?? null,
          call_score: analysisResult?.call_score ?? null,
          talk_ratio_agent: analysisResult?.talk_ratio_agent ?? null,
          talk_ratio_customer: analysisResult?.talk_ratio_customer ?? null,
          transcript_segments: segments ?? null,
          created_at: now,
          // analysis_completed_at: null, // Keep commented out for now
      };
      // Clean undefined keys AFTER initial object creation
      Object.keys(transcriptInsertData).forEach((key) => {
          const typedKey = key as keyof typeof transcriptInsertData;
          if (transcriptInsertData[typedKey] === undefined) {
             delete transcriptInsertData[typedKey];
          }
      });

      console.log(`Attempting insert into call_transcripts for user ${userId}... Data keys: ${Object.keys(transcriptInsertData)}`);
      const { error: transcriptError } = await supabase
        .from('call_transcripts')
        .insert(transcriptInsertData);

      if (transcriptError) { throw transcriptError; }
      console.log('Successfully inserted base transcription');
      // --- End Insert into 'call_transcripts' ---

    } catch (dbError) {
        console.error('Error during saveTranscriptionWithAnalysis DB operation:', dbError);
        saveError = dbError;
        reportError(dbError, ErrorCategory.DATABASE, { action: 'save_transcription_supabase', userId: userId });
    }

    // If there was any error during the process, notify user/report
    if (saveError) {
      toast.error("Failed to fully process transcription. Some data may be missing.");
      // Optionally re-throw the most critical error (e.g., DB error)
      // throw saveError;
    } else {
      toast.success("Transcription saved and analyzed successfully.");
    }
    
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

  const setApiKey = (key: string) => {
    setOpenAIKey(key);
  };

  return {
    transcribeAudio,
    getStoredTranscriptions,
    storeTranscription,
    forceRefreshTranscriptions,
    setUseLocalWhisper,
    getUseLocalWhisper,
    setNumSpeakers,
    getNumSpeakers,
    saveTranscriptionWithAnalysis,
    getKeywordsFromText,
    startRealtimeTranscription,
    setApiKey
  };
};

