import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import Papa from 'papaparse';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from "@/components/ui/use-toast";
import { useEventsStore } from '@/services/events';
import { EventTypeEnum } from '@/services/events/types';
import { useBulkUploadService, BulkUploadFilter } from '@/services/BulkUploadService';
import { Progress } from "@/components/ui/progress";
import { useWhisperService } from '@/services/WhisperService';

interface CSVData {
  filename: string;
  text: string;
  keywords: string;
  sentiment: string;
  call_score: string;
  duration: string;
}

const BulkUploadProcessor: React.FC = () => {
  const [csvData, setCsvData] = useState<CSVData[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [modelName, setModelName] = useState('');
  const { 
    refreshTranscripts, 
    processQueue, 
    isProcessing: isServiceProcessing,
    setAssignedUserId
  } = useBulkUploadService();
  const { toast } = useToast();
  const dispatchEvent = useEventsStore((state) => state.dispatchEvent);
  const { setApiKey: setWhisperApiKey, saveTranscriptionWithAnalysis } = useWhisperService();

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    console.log(`Received ${acceptedFiles.length} files:`, acceptedFiles.map(f => ({
      name: f.name,
      type: f.type,
      size: f.size,
      extension: f.name.split('.').pop()?.toLowerCase()
    })));
    
    // Filter out non-audio files
    const audioFiles = acceptedFiles.filter(file => {
      const isAudio = file.type.startsWith('audio/');
      if (!isAudio) {
        console.warn(`Rejected file ${file.name} (type: ${file.type}) as it's not a valid audio file`);
      }
      return isAudio;
    });
    
    console.log(`${audioFiles.length} of ${acceptedFiles.length} files passed audio validation`);
    
    if (audioFiles.length === 0) {
      toast({
        variant: "destructive",
        title: "No valid audio files",
        description: "Please upload audio files only (WAV, MP3, etc.)"
      });
      return;
    }
    
    setIsUploading(true);
    setUploadProgress(0);
    dispatchEvent(EventTypeEnum.UPLOAD_STARTED);
    
    // Save the API key for Whisper service
    setWhisperApiKey(apiKey);
    localStorage.setItem("openai_api_key", apiKey);

    try {
      const totalRows = audioFiles.length;
      
      // Process CSV data directly instead of converting to audio files
      let successCount = 0;
      
      // Set initial progress
      setUploadProgress(10);
      
      // Process each row in the CSV
      for (let i = 0; i < audioFiles.length; i++) {
        const file = audioFiles[i];
        const progress = Math.round((i / totalRows) * 80) + 10; // Progress from 10% to 90%
        setUploadProgress(progress);
        
        try {
          // Use saveTranscriptionWithAnalysis to directly create transcript from text
          const result = await saveTranscriptionWithAnalysis(
            file.name,
            file,
            file.name
          );
          
          successCount++;
          
          // Log success
          console.log(`Processed CSV row ${i + 1}/${totalRows}: ${file.name}`);
          
          // Small delay between processing to prevent overwhelming the system
          if (i < audioFiles.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        } catch (rowError) {
          console.error(`Error processing CSV row ${i + 1}:`, rowError);
        }
      }
      
      // Completed processing
      setUploadProgress(100);
      setIsUploading(false);
      
      // Force refresh of transcript data
      await refreshTranscripts({ force: true });
      
      // Trigger UI update
      window.dispatchEvent(new CustomEvent('transcriptions-updated'));
      
      // Notify completion
      dispatchEvent(EventTypeEnum.BULK_UPLOAD_COMPLETED, {
        fileCount: audioFiles.length,
        successCount: successCount
      });
      
      toast({
        title: "Upload complete",
        description: `Successfully processed ${successCount} of ${audioFiles.length} items.`,
      });
    } catch (error) {
      console.error('Bulk upload process failed:', error);
      setIsUploading(false);
      dispatchEvent(EventTypeEnum.UPLOAD_ERROR, { error });
      toast({
        variant: "destructive",
        title: "Upload error",
        description: error instanceof Error ? error.message : "Unknown error"
      });
    }
  }, [apiKey, dispatchEvent, refreshTranscripts, saveTranscriptionWithAnalysis, setWhisperApiKey, toast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, accept: {
    'text/csv': ['.csv']
  } });

  const uploadData = async () => {
    if (!apiKey) {
      toast({
        variant: "destructive",
        title: "Configuration required",
        description: "Please provide an OpenAI API Key."
      });
      return;
    }

    if (csvData.length === 0) {
      toast({
        variant: "destructive",
        title: "No data to upload",
        description: "Please upload a CSV file first."
      });
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    dispatchEvent(EventTypeEnum.UPLOAD_STARTED);
    
    // Save the API key for Whisper service
    setWhisperApiKey(apiKey);
    localStorage.setItem("openai_api_key", apiKey);

    try {
      const totalRows = csvData.length;
      
      // Process CSV data directly instead of converting to audio files
      let successCount = 0;
      
      // Set initial progress
      setUploadProgress(10);
      
      // Process each row in the CSV
      for (let i = 0; i < csvData.length; i++) {
        const row = csvData[i];
        const progress = Math.round((i / totalRows) * 80) + 10; // Progress from 10% to 90%
        setUploadProgress(progress);
        
        try {
          // Use saveTranscriptionWithAnalysis to directly create transcript from text
          const result = await saveTranscriptionWithAnalysis(
            row.text || '',
            undefined, // No audio file
            row.filename || `CSV_Import_${i + 1}`
          );
          
          successCount++;
          
          // Log success
          console.log(`Processed CSV row ${i + 1}/${totalRows}: ${row.filename || 'Unnamed'}`);
          
          // Small delay between processing to prevent overwhelming the system
          if (i < csvData.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        } catch (rowError) {
          console.error(`Error processing CSV row ${i + 1}:`, rowError);
        }
      }
      
      // Completed processing
      setUploadProgress(100);
      setIsUploading(false);
      
      // Force refresh of transcript data
      await refreshTranscripts({ force: true });
      
      // Trigger UI update
      window.dispatchEvent(new CustomEvent('transcriptions-updated'));
      
      // Notify completion
      dispatchEvent(EventTypeEnum.BULK_UPLOAD_COMPLETED, {
        fileCount: csvData.length,
        successCount: successCount
      });
      
      toast({
        title: "Upload complete",
        description: `Successfully processed ${successCount} of ${csvData.length} items.`,
      });
    } catch (error) {
      console.error('Bulk upload process failed:', error);
      setIsUploading(false);
      dispatchEvent(EventTypeEnum.UPLOAD_ERROR, { error });
      toast({
        variant: "destructive",
        title: "Upload error",
        description: error instanceof Error ? error.message : "Unknown error"
      });
    }
  };

  const refreshData = async (force = false) => {
    try {
      toast({
        description: "Refreshing transcript data...",
      });
      await refreshTranscripts({ force: force });
      toast({
        title: "Data refreshed",
        description: "Successfully refreshed transcript data.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Refresh error",
        description: error instanceof Error ? error.message : "Unknown error"
      });
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold mb-4">CSV Data Upload</h2>

      <div className="space-y-4">
        <div>
          <Label htmlFor="apiKey">OpenAI API Key</Label>
          <Input
            type="password"
            id="apiKey"
            placeholder="Enter API Key"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            className="mt-1"
          />
        </div>

        <div>
          <Label htmlFor="modelName">Model Name (Optional)</Label>
          <Input
            type="text"
            id="modelName"
            placeholder="Enter Model Name (e.g. gpt-4)"
            value={modelName}
            onChange={(e) => setModelName(e.target.value)}
            className="mt-1"
          />
        </div>
      </div>

      <div {...getRootProps()} className={`dropzone ${isDragActive ? 'active' : ''} border-2 border-dashed p-6 rounded cursor-pointer text-center`}>
        <input {...getInputProps()} />
        {
          isDragActive ?
            <p>Drop the CSV file here ...</p> :
            <p>Drag 'n' drop a CSV file here, or click to select file</p>
        }
      </div>

      {csvData.length > 0 && (
        <div>
          <h3 className="text-md font-medium mb-2">Uploaded Data Preview</h3>
          <div className="max-h-40 overflow-y-auto border rounded-md">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Filename</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Text</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {csvData.slice(0, 5).map((row, index) => (
                  <tr key={index}>
                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{row.filename || `Item ${index + 1}`}</td>
                    <td className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400 truncate max-w-xs">{row.text || 'No text'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {csvData.length > 5 && (
              <div className="p-2 text-center text-sm text-gray-500 dark:text-gray-400">
                Showing 5 of {csvData.length} items
              </div>
            )}
          </div>
        </div>
      )}

      {uploadProgress > 0 && isUploading && (
        <div>
          <Label>Upload Progress</Label>
          <Progress value={uploadProgress} />
          <p className="text-sm text-gray-500 mt-1">Processing {csvData.length} items...</p>
        </div>
      )}

      <div className="flex gap-4">
        <Button 
          onClick={uploadData} 
          disabled={isUploading || isServiceProcessing || csvData.length === 0}
          className="bg-neon-purple hover:bg-neon-purple/90 text-white"
        >
          {isUploading ? 'Processing...' : 'Process CSV Data'}
        </Button>
        <Button 
          onClick={() => refreshData(true)}
          variant="outline"
        >
          Refresh Data
        </Button>
      </div>
    </div>
  );
};

export default BulkUploadProcessor;
