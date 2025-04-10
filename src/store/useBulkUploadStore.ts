import { create } from 'zustand';
import { supabase } from '@/integrations/supabase/client';
import { Json } from '@/integrations/supabase/types';

export type UploadStatus = 'queued' | 'processing' | 'complete' | 'error';

// Type for file being processed
export interface BulkUploadFile {
  id: string;
  file: File;
  status: UploadStatus;
  progress: number;
  createdAt: string;
  userId: string;
  transcriptId: string | null;
  error: string | null;
  result: string | null;
  lastUpdated?: number; // Timestamp of last status update
}

// Type for history records from database
export interface UploadHistoryRecord {
  id: string;
  filename: string;
  created_at: string;
  user_id: string;
  duration: number | null; // Allow null
  call_score: number | null; // Allow null
  sentiment: string | null; // Allow null
  text: string;
  keywords: string[] | null; // Allow null
  transcript_segments: Json | null; // Allow null
}

interface BulkUploadStore {
  files: BulkUploadFile[];
  isProcessing: boolean;
  uploadHistory: UploadHistoryRecord[]; // History from database
  hasLoadedHistory: boolean;
  processingLock: boolean; // Add lock to prevent concurrent processing
  userId?: string; // User ID to associate with uploads
  addFiles: (files: File[], userId?: string) => void;
  updateFileStatus: (id: string, status: UploadStatus, progress: number, result?: string, error?: string, transcriptId?: string) => void;
  removeFile: (id: string) => void;
  clearCompleted: () => void;
  setProcessing: (isProcessing: boolean) => void;
  resetStore: () => void;
  loadUploadHistory: () => Promise<void>;
  acquireProcessingLock: () => boolean;
  releaseProcessingLock: () => void;
}

export const useBulkUploadStore = create<BulkUploadStore>((set, get) => ({
  files: [],
  isProcessing: false,
  uploadHistory: [],
  hasLoadedHistory: false,
  processingLock: false,
  userId: undefined,
  
  addFiles: (files: File[], userId?: string) => {
    const timestamp = Date.now(); // Consistent timestamp for this batch
    console.log(`[${timestamp}] Adding ${files.length} files to queue with userId: ${userId || 'undefined'}`);
    
    set(state => {
      const newFiles = Array.from(files).map((file, index) => ({
        id: `file-${timestamp}-${index}-${Math.random().toString(36).substr(2, 5)}`, // Improved ID
        file,
        status: 'queued' as UploadStatus,
        progress: 0,
        createdAt: new Date().toISOString(),
        userId: userId || state.userId || 'unknown',
        transcriptId: null,
        error: null,
        result: null,
        lastUpdated: 0 // Initialize lastUpdated
      }));
      
      // Log details of the files being added
      console.log(`[${timestamp}] Created file objects:`, newFiles.map(f => ({id: f.id, name: f.file.name, status: f.status, userId: f.userId })));
      
      const updatedFiles = [...state.files, ...newFiles];
      console.log(`[${timestamp}] New files state length: ${updatedFiles.length}`);
      
      return { 
        files: updatedFiles,
        userId: userId || state.userId
      };
    });
    // Log state *after* update (Zustand updates might be async)
    setTimeout(() => console.log(`[${timestamp}] Store state AFTER addFiles:`, get().files.map(f=>f.status)), 0); 
  },
  
  updateFileStatus: (id, status, progress, result, error, transcriptId) => {
    // Throttle updates to reduce UI jitter - max 5 updates per second per file
    const now = Date.now();
    const file = get().files.find(f => f.id === id);
    
    if (file && file.lastUpdated && now - file.lastUpdated < 200) {
      // Skip update if it's too soon after the last one,
      // unless it's a status change or completing an upload
      if (file.status === status && status !== 'complete' && status !== 'error') {
        return;
      }
    }
    
    set(state => ({
      files: state.files.map(file => 
        file.id === id 
          ? { 
              ...file, 
              status, 
              progress: Math.min(100, Math.max(0, progress)), // Clamp progress between 0-100
              result, 
              error, 
              transcriptId,
              lastUpdated: now
            } 
          : file
      )
    }));
    
    console.log(`Updated file ${id} status to ${status} with progress ${progress}%`);
    
    // Check if processing is complete
    const { files, isProcessing } = get();
    if (isProcessing && files.every(file => 
      file.status === 'complete' || file.status === 'error')) {
      console.log('All files processed');
      get().setProcessing(false);
      // Note: Don't release the lock here. Let the UI component do it after update events
    }
  },
  
  removeFile: (id) => {
    const fileToRemove = get().files.find(file => file.id === id);
    
    if (fileToRemove && fileToRemove.status === 'processing') {
      console.log(`Cannot remove file ${id} while it's processing`);
      return;
    }
    
    set(state => ({
      files: state.files.filter(file => file.id !== id)
    }));
    
    console.log(`Removed file ${id} from queue`);
  },
  
  clearCompleted: () => {
    set(state => ({
      files: state.files.filter(file => file.status !== 'complete')
    }));
    
    console.log('Cleared completed files from queue');
  },
  
  setProcessing: (isProcessing) => {
    console.log(`[Store] Setting isProcessing from ${get().isProcessing} to: ${isProcessing}`);
    set({ isProcessing });
  },
  
  resetStore: () => {
    set({
      files: [],
      isProcessing: false,
      processingLock: false
    });
    
    console.log('Reset bulk upload store state');
  },
  
  loadUploadHistory: async () => {
    try {
      console.log('Loading upload history from Supabase...');
      // Correctly formatted select string
      const selectColumns = 
        'id, filename, created_at, user_id, duration, call_score, sentiment, text, keywords, transcript_segments';
      
      const { data, error } = await supabase
        .from('call_transcripts')
        .select(selectColumns) // Pass the correct string
        .order('created_at', { ascending: false })
        .limit(100);
        
      if (!error && data) {
        console.log(`Loaded ${data.length} items for upload history`);
        set({ 
          uploadHistory: (data as UploadHistoryRecord[]),
          hasLoadedHistory: true
        });
      } else {
        console.error('Error loading upload history:', error);
        set({ hasLoadedHistory: true });
      }
    } catch (error) {
      console.error('Exception loading upload history:', error);
      set({ hasLoadedHistory: true });
    }
  },
  
  acquireProcessingLock: () => {
    const { processingLock } = get();
    console.log(`[Store] Attempting acquire lock. Current lock state: ${processingLock}`);
    if (processingLock) {
      console.warn('[Store] Processing lock already acquired, cannot process files');
      return false;
    }
    
    console.log('[Store] Acquiring processing lock');
    set({ processingLock: true });
    return true;
  },
  
  releaseProcessingLock: () => {
    console.log('[Store] Releasing processing lock');
    set({ processingLock: false });
  }
}));
