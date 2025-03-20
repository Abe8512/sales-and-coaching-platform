import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface WhisperTranscriptionResponse {
  id: string;
  text: string;
  segments: Array<TranscriptSegment>;
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
  customerName?: string;
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
  try {
    console.log(`Processing file: ${audioFile.name}, type: ${audioFile.type}, size: ${audioFile.size}`);
    
    // Get the OpenAI API key from localStorage
    const apiKey = localStorage.getItem("openai_api_key");
    
    if (!apiKey && !useLocalWhisperSetting) {
      console.error('OpenAI API key not found and local Whisper is not enabled');
      throw new Error('OpenAI API key not found. Please add your API key in settings or enable local Whisper.');
    }
    
    // Stronger validation of file types - explicitly reject text files
    const rejectedMimeTypes = ['text/plain', 'text/csv', 'text/html', 'text/javascript', 'application/json', 'text/xml', 'application/xml'];
    if (rejectedMimeTypes.some(type => audioFile.type.includes(type))) {
      // Get file extension to check if it might actually be an audio file with wrong MIME type
      const extension = audioFile.name.split('.').pop()?.toLowerCase();
      const audioExtensions = ['wav', 'mp3', 'm4a', 'ogg', 'webm', 'mp4', 'aac', 'flac'];
      
      // If it has an audio extension, we'll try to correct the MIME type
      if (extension && audioExtensions.includes(extension)) {
        console.log(`File ${audioFile.name} has text MIME type (${audioFile.type}) but audio extension. Attempting to correct.`);
        // Continue processing but we'll fix the MIME type below
      } else {
        // It's definitely a text file - reject it
        console.error(`Rejecting file with unsupported MIME type: ${audioFile.type}`);
        throw new Error(`File type ${audioFile.type} is not supported. Please upload audio files only.`);
      }
    }
    
    // Check file extension as well
    const fileExtension = audioFile.name.split('.').pop()?.toLowerCase();
    const rejectedExtensions = ['txt', 'json', 'csv', 'xml', 'html', 'js', 'jsx', 'ts', 'tsx'];
    if (!fileExtension || rejectedExtensions.includes(fileExtension)) {
      console.error(`Rejecting file with unsupported extension: ${fileExtension}`);
      throw new Error(`File extension .${fileExtension || 'unknown'} is not supported. Please upload audio files only.`);
    }
    
    // Format data for OpenAI API
    console.log('Creating form data for API request');
    const formData = new FormData();
    
    // Ensure the file has a proper name with appropriate extension
    // Wrap the file in a new File object with explicit name if needed
    let fileToUpload = audioFile;
    
    // Check if the file has a proper name with extension
    if (!audioFile.name.includes('.')) {
      // Get file extension from MIME type
      const extension = audioFile.type.split('/')[1] || 'wav';
      const newFileName = `audio.${extension}`;
      fileToUpload = new File([audioFile], newFileName, { type: audioFile.type });
      console.log(`Added proper file name: ${newFileName} to ensure MIME type recognition`);
    } else {
      // For files with extensions, ensure the type matches the extension
      const extension = audioFile.name.split('.').pop()?.toLowerCase();
      const audioType = extension === 'mp3' ? 'audio/mpeg' : 
                       extension === 'wav' ? 'audio/wav' :
                       extension === 'm4a' ? 'audio/mp4' :
                       extension === 'mp4' ? 'audio/mp4' :
                       extension === 'ogg' ? 'audio/ogg' :
                       extension === 'webm' ? 'audio/webm' :
                       extension === 'flac' ? 'audio/flac' :
                       extension === 'aac' ? 'audio/aac' :
                       'audio/mpeg';
      
      // If the type doesn't match the expected audio type, correct it
      if (extension && 
          (audioFile.type.includes('text/') || 
           !audioFile.type.includes(extension) && 
           !audioFile.type.includes('octet-stream'))) {
        console.log(`File ${audioFile.name} has mismatched type (${audioFile.type}), correcting to ${audioType}`);
        fileToUpload = new File([audioFile], audioFile.name, { type: audioType });
      }
    }
    
    // Final validation check - only allow audio MIME types
    const validAudioType = fileToUpload.type.startsWith('audio/') || 
                          fileToUpload.type === 'application/octet-stream';
    
    if (!validAudioType) {
      console.error(`File ${fileToUpload.name} has invalid MIME type: ${fileToUpload.type}`);
      throw new Error(`Invalid file type: ${fileToUpload.type}. The Whisper API only accepts audio files.`);
    }
    
    // Extra sanity check - reject any text-based content
    if (fileToUpload.type.includes('text/') || 
        fileToUpload.type.includes('application/json') ||
        fileToUpload.type.includes('application/xml')) {
      console.error(`Final check rejected text file: ${fileToUpload.name} with type ${fileToUpload.type}`);
      throw new Error(`Text files are not supported. Please upload audio files only.`);
    }
    
    // Check the actual content of the file if possible to detect misrepresented text files
    try {
      // For small files, we can try to check the first few bytes
      // This is a simple heuristic and not foolproof
      if (fileToUpload.size < 1024 * 100) { // Only for files under 100KB
        const slice = fileToUpload.slice(0, 4);
        const buffer = await slice.arrayBuffer();
        const bytes = new Uint8Array(buffer);
        
        // Text files often start with ASCII text or UTF-8 BOM
        const possibleTextFile = 
          // ASCII text ranges (letters, numbers, common punctuation)
          (bytes[0] >= 32 && bytes[0] <= 126 && 
           bytes[1] >= 32 && bytes[1] <= 126 &&
           bytes[2] >= 32 && bytes[2] <= 126) ||
          // UTF-8 BOM
          (bytes[0] === 0xEF && bytes[1] === 0xBB && bytes[2] === 0xBF);
        
        if (possibleTextFile) {
          // Check more thoroughly by reading more content as text
          const textSample = await fileToUpload.slice(0, 500).text();
          
          // Check if it looks like text content (contains spaces, line breaks, and mostly printable characters)
          const seemsLikeText = 
            textSample.includes(' ') && 
            (textSample.includes('\n') || textSample.includes('\r')) &&
            /^[\x20-\x7E\s]+$/.test(textSample.substring(0, 100)); // Check first 100 chars are ASCII printable
          
          if (seemsLikeText) {
            console.error(`File ${fileToUpload.name} appears to contain text content despite having audio extension`);
            throw new Error(`This file appears to contain text rather than audio. Please upload a valid audio file.`);
          }
        }
      }
    } catch (e) {
      // If we can't read the file, continue with the request
      console.log(`Could not analyze file content: ${e}`);
    }
    
    // Log details about the file being uploaded
    console.log('Uploading file to Whisper API:', {
      fileName: fileToUpload.name,
      fileType: fileToUpload.type,
      fileSize: fileToUpload.size,
      hasExtension: fileToUpload.name.includes('.'),
      extension: fileToUpload.name.split('.').pop()
    });
    
    // Ensure proper content type is sent to the API by explicitly naming the file
    // This helps the API correctly identify the file type
    formData.append('file', fileToUpload, fileToUpload.name);
    formData.append('model', 'whisper-1'); // Always use the latest model
    formData.append('response_format', 'json');
    if (numSpeakers > 1) {
      formData.append('speakers', numSpeakers.toString());
    }
    
    // Implement retry logic for API calls
    const maxRetries = 3;
    let lastError = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`API attempt ${attempt}/${maxRetries}: Sending request to API endpoint`);
        
        // Make request to OpenAI API through our proxy
        const response = await fetch('/api/transcribe', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
          },
          body: formData,
        });
        
        console.log(`API response status: ${response.status} ${response.statusText}`);
        
        // Handle specific error codes
        if (!response.ok) {
          const errorText = await response.text();
          console.error(`Transcription error (${response.status}):`, errorText);
          
          // Parse error response if possible
          let errorDetail = "Unknown error";
          try {
            const errorJson = JSON.parse(errorText);
            errorDetail = errorJson.error?.message || errorJson.message || errorText;
          } catch (e) {
            errorDetail = errorText || response.statusText;
          }
          
          // Check for content-type issues specifically
          if (errorDetail.includes('Content-Type') || errorDetail.includes('content-type')) {
            console.error('Content-Type error detected:', errorDetail);
            throw new Error(`Content-Type error: ${errorDetail}. The Whisper API only accepts audio files.`);
          }
          
          // Handle specific error codes
          if (response.status === 401) {
            throw new Error(`Authentication error: Invalid API key. Please check your OpenAI API key.`);
          } else if (response.status === 429) {
            console.warn(`Rate limit hit, attempt ${attempt}/${maxRetries}. Retrying after delay...`);
            // Wait longer between retries with exponential backoff
            await new Promise(r => setTimeout(r, Math.min(1000 * Math.pow(2, attempt - 1), 10000)));
            continue;
          } else if (response.status === 415) {
            // Specific handling for Unsupported Media Type error
            throw new Error(`Unsupported Media Type: The API cannot process this file type. Please upload a supported audio format (MP3, MP4, WAV, etc.).`);
          } else if (response.status >= 500) {
            console.warn(`Server error (${response.status}), attempt ${attempt}/${maxRetries}. Retrying...`);
            await new Promise(r => setTimeout(r, 1000));
            continue;
          }
          
          throw new Error(`Transcription failed: ${errorDetail}`);
        }
        
        // Parse the successful response
        const data = await response.json();
        console.log('Received data from API:', data ? 'success' : 'empty response');
        
        if (!data || !data.text) {
          console.error('Invalid transcription response:', data);
          throw new Error('Received invalid response from transcription service');
        }
        
        // Create our response format
        const transcription: WhisperTranscriptionResponse = {
          id: uuidv4(),
          text: data.text,
          segments: data.segments || [],
          language: data.language || 'en',
          duration: data.duration || (audioFile.size / 16000) // Use returned duration or estimate from file size
        };
        
        // Store the transcription in local storage and return
        storeTranscription(transcription);
        console.log('Transcription completed and stored successfully');
        
        return transcription;
      } catch (apiError) {
        lastError = apiError;
        console.error(`API attempt ${attempt} failed:`, apiError);
        
        // Don't retry client errors (4xx) except rate limits which are handled above
        if (apiError.message?.includes('401') || 
            apiError.message?.includes('400') || 
            apiError.message?.includes('403')) {
          break;
        }
        
        // For network errors or server errors, retry with delay
        if (attempt < maxRetries) {
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
          console.log(`Retrying in ${delay}ms...`);
          await new Promise(r => setTimeout(r, delay));
        }
      }
    }
    
    // If we reach here, all retries failed
    throw lastError || new Error('Transcription failed after multiple attempts');
  } catch (error) {
    console.error('Error transcribing audio:', error);
    throw error; // Re-throw to be handled by caller
  }
};

export const useWhisperService = () => {
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

  const saveTranscriptionWithAnalysis = async (text: string, audioFile?: File, fileName?: string) => {
    if (!text || text.trim() === '') {
      console.error('Cannot save empty transcription');
      return;
    }
    
    const now = new Date().toISOString();
    const transcriptionId = uuidv4();
    const duration = audioFile ? await getAudioDuration(audioFile) : 0;
    
    // Extract customer and rep names from text
    const { repName, customerName } = extractNames(text);
    console.log(`Extracted names for saving - Rep: ${repName}, Customer: ${customerName}`);
    
    // Create new transcription
    const newTranscription: StoredTranscription = {
      id: transcriptionId,
      text: text,
      date: now,
      duration: duration,
      speakerName: repName || "Unknown Speaker",
      customerName: customerName || undefined,
      callScore: 70 + Math.floor(Math.random() * 20), // Random score between 70-90
      sentiment: Math.random() > 0.7 ? "positive" : Math.random() > 0.4 ? "neutral" : "negative",
      keywords: getKeywordsFromText(text),
      filename: fileName,
    };
    
    // Store locally
    const existingTranscriptions = getStoredTranscriptions();
    localStorage.setItem(TRANSCRIPTIONS_STORAGE_KEY, JSON.stringify([...existingTranscriptions, newTranscription]));
    
    // Save to Supabase
    try {
      await supabase.from('calls').insert({
        id: transcriptionId,
        transcription: text,
        date: now,
        duration: duration,
        sentiment_agent: newTranscription.sentiment === 'positive' ? 0.8 : 
                       newTranscription.sentiment === 'negative' ? 0.3 : 0.5,
        sentiment_customer: newTranscription.sentiment === 'positive' ? 0.7 : 
                          newTranscription.sentiment === 'negative' ? 0.4 : 0.6,
        talk_ratio_agent: 60,
        talk_ratio_customer: 40,
        sales_rep_name: newTranscription.speakerName,
        customer_name: newTranscription.customerName,
        filename: newTranscription.filename
      });
      
      // Emit event to notify other components
      window.dispatchEvent(new CustomEvent('transcriptions-updated'));
    } catch (error) {
      console.error('Error saving to Supabase:', error);
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

// Extract names from transcript text
export const extractNames = (transcriptText: string): { repName?: string, customerName?: string } => {
  // Patterns to match name introductions
  const namePattern = /\b(?:my name is|I am|this is|I'm|speaking with)\s([A-Z][a-z]+(?:\s[A-Z][a-z]+)?)/gi;
  const detectedNames = [];
  
  let match;
  while ((match = namePattern.exec(transcriptText)) !== null) {
    detectedNames.push(match[1]);
  }
  
  console.log('Detected names:', detectedNames);
  
  // Try to detect who is the rep and who is the customer
  // This is a simplistic approach and would need refinement in production
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
    // Assume first name mentioned is the rep (common in sales calls)
    repName = detectedNames[0];
    
    // If we have a second name, assume it's the customer
    if (detectedNames.length > 1) {
      customerName = detectedNames[1];
    }
  }
  
  return { repName, customerName };
};

// Save transcription to Supabase
const saveToSupabase = async (transcription: StoredTranscription): Promise<void> => {
  try {
    const { error } = await supabase
      .from('calls')
      .upsert({
        id: transcription.id,
        transcription: transcription.text,
        date: transcription.date,
        duration: transcription.duration || 0,
        sentiment_agent: transcription.sentiment === 'positive' ? 0.8 : 
                        transcription.sentiment === 'negative' ? 0.3 : 0.5,
        sentiment_customer: transcription.sentiment === 'positive' ? 0.7 : 
                           transcription.sentiment === 'negative' ? 0.4 : 0.6,
        talk_ratio_agent: 60,
        talk_ratio_customer: 40,
        sales_rep_name: transcription.speakerName,
        customer_name: transcription.customerName,
        filename: transcription.filename
      });
      
    if (error) {
      console.error('Error saving to Supabase:', error);
      toast.error('Failed to save call data');
    } else {
      console.log('Successfully saved to Supabase');
      toast.success('Call data saved successfully');
      
      // Emit event to notify other components
      window.dispatchEvent(new CustomEvent('transcriptions-updated'));
    }
  } catch (e) {
    console.error('Exception saving to Supabase:', e);
    toast.error('Failed to save call data');
  }
};

// Add this helper function to get audio duration
const getAudioDuration = (file: File): Promise<number> => {
  return new Promise((resolve) => {
    const audio = new Audio();
    audio.addEventListener('loadedmetadata', () => {
      // Duration in seconds
      resolve(Math.round(audio.duration));
    });
    
    // Handle errors or files that can't get duration
    audio.addEventListener('error', () => {
      console.warn('Could not determine audio duration, using estimate');
      // Estimate duration based on file size (very rough estimate)
      const estimatedDuration = Math.round(file.size / 16000); // ~16KB per second for low quality audio
      resolve(estimatedDuration);
    });
    
    audio.src = URL.createObjectURL(file);
  });
};
