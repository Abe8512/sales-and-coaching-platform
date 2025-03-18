
import { create } from 'zustand';
import { supabase } from '@/integrations/supabase/client';

export type UploadStatus = 'queued' | 'processing' | 'complete' | 'error';

export interface BulkUploadFile {
  id: string;
  file: File;
  status: UploadStatus;
  progress: number;
  result?: string;
  error?: string;
  transcriptId?: string;
  lastUpdated?: number; // Add timestamp for tracking updates
}

interface BulkUploadStore {
  files: BulkUploadFile[];
  isProcessing: boolean;
  uploadHistory: any[];
  hasLoadedHistory: boolean;
  processingLock: boolean; // Add lock to prevent concurrent processing
  addFiles: (files: File[]) => void;
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
  
  addFiles: (files: File[]) => {
    // Deduplicate files by name
    const existingFileNames = new Set(get().files.map(f => f.file.name));
    
    const newFiles = files
      .filter(file => !existingFileNames.has(file.name))
      .map(file => ({
        id: crypto.randomUUID(),
        file,
        status: 'queued' as UploadStatus,
        progress: 0,
        lastUpdated: Date.now()
      }));
    
    if (newFiles.length === 0) {
      console.log('No new files to add (all duplicates)');
      return;
    }
    
    set(state => ({
      files: [...state.files, ...newFiles]
    }));
    
    console.log(`Added ${newFiles.length} files to upload queue`);
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
