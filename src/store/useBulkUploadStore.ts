
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
    const newFiles = files.map(file => ({
      id: crypto.randomUUID(),
      file,
      status: 'queued' as UploadStatus,
      progress: 0,
      lastUpdated: Date.now()
    }));
    
    set(state => ({
      files: [...state.files, ...newFiles]
    }));
    
    console.log(`Added ${files.length} files to upload queue`);
  },
  
  updateFileStatus: (id, status, progress, result, error, transcriptId) => {
    set(state => ({
      files: state.files.map(file => 
        file.id === id 
          ? { 
              ...file, 
              status, 
              progress, 
              result, 
              error, 
              transcriptId,
              lastUpdated: Date.now() 
            } 
          : file
      )
    }));
    
    console.log(`Updated file ${id} status to ${status} with progress ${progress}%`);
    
    // Check if processing is complete
    const { files, isProcessing } = get();
    if (isProcessing && files.every(file => 
      file.status === 'complete' || file.status === 'error')) {
      console.log('All files processed, releasing processing lock');
      get().setProcessing(false);
      get().releaseProcessingLock();
    }
  },
  
  removeFile: (id) => {
    set(state => ({
      files: state.files.filter(file => file.id !== id)
    }));
  },
  
  clearCompleted: () => {
    set(state => ({
      files: state.files.filter(file => file.status !== 'complete')
    }));
  },
  
  setProcessing: (isProcessing) => {
    set({ isProcessing });
  },
  
  resetStore: () => {
    set({
      files: [],
      isProcessing: false,
      processingLock: false
    });
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
