
import React, { useState, useRef, useEffect } from 'react';
import { Button } from '../ui/button';
import { Mic, MicOff, Loader2 } from 'lucide-react';
import { useWhisperService } from '@/services/WhisperService';
import { useToast } from '@/hooks/use-toast';
import AIWaveform from '../ui/AIWaveform';

interface SpeechToTextRecorderProps {
  onTranscriptionComplete?: (text: string) => void;
  buttonSize?: 'sm' | 'md' | 'lg';
  showTranscript?: boolean;
  className?: string;
}

const SpeechToTextRecorder = ({
  onTranscriptionComplete,
  buttonSize = 'md',
  showTranscript = false,
  className = ''
}: SpeechToTextRecorderProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [recordingDuration, setRecordingDuration] = useState(0);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  const { toast } = useToast();
  const { transcribeAudio, getUseLocalWhisper } = useWhisperService();
  
  useEffect(() => {
    // Cleanup on unmount
    return () => {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
        
        if (mediaRecorderRef.current.stream) {
          mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
        }
      }
    };
  }, []);
  
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];
      
      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };
      
      mediaRecorderRef.current.onstop = async () => {
        if (audioChunksRef.current.length > 0) {
          setIsProcessing(true);
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          
          try {
            const result = await transcribeAudio(audioBlob);
            
            if (result) {
              setTranscript(result.text);
              
              if (onTranscriptionComplete) {
                onTranscriptionComplete(result.text);
              }
            }
          } catch (error) {
            console.error('Transcription error:', error);
            toast({
              title: 'Transcription Failed',
              description: error instanceof Error ? error.message : 'Could not transcribe audio',
              variant: 'destructive',
            });
          } finally {
            setIsProcessing(false);
          }
        }
      };
      
      // Start recording
      mediaRecorderRef.current.start();
      setIsRecording(true);
      setRecordingDuration(0);
      
      // Start a timer to track recording duration
      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
      
      toast({
        title: 'Recording Started',
        description: `Using ${getUseLocalWhisper() ? 'local Whisper model' : 'OpenAI API'}`
      });
    } catch (error) {
      console.error('Error starting recording:', error);
      toast({
        title: 'Recording Failed',
        description: 'Could not access microphone',
        variant: 'destructive',
      });
    }
  };
  
  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      
      if (mediaRecorderRef.current.stream) {
        mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      }
      
      setIsRecording(false);
      
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
      
      toast({
        title: 'Recording Stopped',
        description: 'Processing your audio...'
      });
    }
  };
  
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
  };
  
  const buttonSizeClass = {
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-12 w-12'
  };
  
  return (
    <div className={`flex flex-col items-center ${className}`}>
      <Button
        type="button"
        size="icon"
        variant={isRecording ? 'destructive' : 'default'}
        onClick={isRecording ? stopRecording : startRecording}
        disabled={isProcessing}
        className={buttonSizeClass[buttonSize]}
      >
        {isProcessing ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : isRecording ? (
          <MicOff className="h-4 w-4" />
        ) : (
          <Mic className="h-4 w-4" />
        )}
      </Button>
      
      {isRecording && (
        <div className="mt-2 flex flex-col items-center">
          <span className="text-xs font-medium">{formatTime(recordingDuration)}</span>
          <AIWaveform color="blue" barCount={8} className="h-4 mt-1" />
        </div>
      )}
      
      {showTranscript && transcript && (
        <div className="mt-3 p-3 border rounded-md text-sm max-w-md">
          {transcript}
        </div>
      )}
    </div>
  );
};

export default SpeechToTextRecorder;
