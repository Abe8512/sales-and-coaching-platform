
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
}

interface BulkUploadStore {
  files: BulkUploadFile[];
  isProcessing: boolean;
  uploadHistory: any[];
  hasLoadedHistory: boolean;
  addFiles: (files: File[]) => void;
  updateFileStatus: (id: string, status: UploadStatus, progress: number, result?: string, error?: string, transcriptId?: string) => void;
  removeFile: (id: string) => void;
  clearCompleted: () => void;
  setProcessing: (isProcessing: boolean) => void;
  resetStore: () => void;
  loadUploadHistory: () => Promise<void>;
}

export const useBulkUploadStore = create<BulkUploadStore>((set, get) => ({
  files: [],
  isProcessing: false,
  uploadHistory: [],
  hasLoadedHistory: false,
  
  addFiles: (files: File[]) => {
    const newFiles = files.map(file => ({
      id: crypto.randomUUID(),
      file,
      status: 'queued' as UploadStatus,
      progress: 0
    }));
    
    set(state => ({
      files: [...state.files, ...newFiles]
    }));
  },
  
  updateFileStatus: (id, status, progress, result, error, transcriptId) => {
    set(state => ({
      files: state.files.map(file => 
        file.id === id 
          ? { ...file, status, progress, result, error, transcriptId } 
          : file
      )
    }));
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
      isProcessing: false
    });
  },
  
  loadUploadHistory: async () => {
    try {
      const { data, error } = await supabase
        .from('call_transcripts')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (!error && data) {
        set({ 
          uploadHistory: data,
          hasLoadedHistory: true
        });
      }
    } catch (error) {
      console.error('Error loading upload history:', error);
    }
  }
}));
