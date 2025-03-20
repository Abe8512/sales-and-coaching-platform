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
  duration: number;
  call_score: number;
  sentiment: string;
  text: string;
  keywords: string[];
  transcript_segments: Json;
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
    console.log(`Adding ${files.length} files to queue with userId: ${userId || 'undefined'}`);
    
    set(state => {
      const newFiles = Array.from(files).map(file => ({
        id: `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        file,
        status: 'queued' as UploadStatus,
        progress: 0,
        createdAt: new Date().toISOString(),
        userId: userId || state.userId || 'unknown',
        transcriptId: null,
        error: null,
        result: null
      }));
      
      console.log(`Created ${newFiles.length} new file objects with status queued`);
      console.log(`First file userId: ${newFiles[0]?.userId}`);
      
      return { 
        files: [...state.files, ...newFiles],
        userId: userId || state.userId
      };
    });
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
    set({ isProcessing });
    console.log(`Set processing state to: ${isProcessing}`);
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
      const { data, error } = await supabase
        .from('call_transcripts')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (!error && data) {
        console.log(`Loaded ${data.length} items from upload history`);
        set({ 
          uploadHistory: data,
          hasLoadedHistory: true
        });
      } else {
        console.error('Error loading upload history:', error);
      }
    } catch (error) {
      console.error('Exception loading upload history:', error);
    }
  },
  
  acquireProcessingLock: () => {
    const { processingLock } = get();
    if (processingLock) {
      console.log('Processing lock already acquired, cannot process files');
      return false;
    }
    
    console.log('Acquiring processing lock');
    set({ processingLock: true });
    return true;
  },
  
  releaseProcessingLock: () => {
    console.log('Releasing processing lock');
    set({ processingLock: false });
  }
}));
