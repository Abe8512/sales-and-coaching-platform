
import React, { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Mic, MicOff, MessageSquare, Settings, Zap } from "lucide-react";
import { useWhisperService } from "@/services/WhisperService";
import AIWaveform from "../ui/AIWaveform";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { useNavigate } from "react-router-dom";
import { Progress } from "@/components/ui/progress";

const LiveCallAnalysis = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState<string>("");
  const [suggestions, setSuggestions] = useState<string[]>([
    "Ask more open-ended questions about their specific needs",
    "Acknowledge the concern before addressing it directly",
    "Try using the phrase 'What I'm hearing is...' to confirm understanding"
  ]);
  const [apiKey, setApiKey] = useState("");
  const [openAPIKeyDialog, setOpenAPIKeyDialog] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(false);
  const [processingChunk, setProcessingChunk] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { transcribeAudio, saveTranscriptionWithAnalysis, setOpenAIKey } = useWhisperService();

  useEffect(() => {
    // Check if API key exists in localStorage
    const storedKey = localStorage.getItem("openai_api_key");
    if (storedKey) {
      setHasApiKey(true);
      setApiKey(storedKey);
    }
  }, []);

  // Generate AI suggestions based on transcript content
  const generateSuggestions = (text: string) => {
    // Very basic keyword-based suggestion generation
    const newSuggestions = [];
    
    if (text.toLowerCase().includes('price') || text.toLowerCase().includes('cost')) {
      newSuggestions.push("Focus on value proposition rather than price");
    }
    
    if (text.toLowerCase().includes('competitor') || text.toLowerCase().includes('alternative')) {
      newSuggestions.push("Highlight our unique features like [feature] that competitors don't have");
    }
    
    if (text.toLowerCase().includes('think') || text.toLowerCase().includes('consider')) {
      newSuggestions.push("Ask 'What would make this decision easier for you?'");
    }
    
    if (text.toLowerCase().includes('not sure') || text.toLowerCase().includes('uncertain')) {
      newSuggestions.push("Share a relevant case study to build confidence");
    }

    if (text.toLowerCase().includes('timeline') || text.toLowerCase().includes('when')) {
      newSuggestions.push("Suggest a concrete next step with a specific date");
    }
    
    // Add default suggestions if we don't have enough context-specific ones
    if (newSuggestions.length < 3) {
      if (!newSuggestions.includes("Ask more open-ended questions about their specific needs")) {
        newSuggestions.push("Ask more open-ended questions about their specific needs");
      }
      
      if (newSuggestions.length < 3 && !newSuggestions.includes("Try summarizing what you've heard so far")) {
        newSuggestions.push("Try summarizing what you've heard so far");
      }
      
      if (newSuggestions.length < 3 && !newSuggestions.includes("Consider asking about their timeline for implementation")) {
        newSuggestions.push("Consider asking about their timeline for implementation");
      }
    }
    
    return newSuggestions.slice(0, 3);
  };

  const startRecording = async () => {
    if (!hasApiKey) {
      toast({
        title: "API Key Required",
        description: "Please set your OpenAI API key in settings first",
        variant: "destructive",
      });
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];
      setRecordingDuration(0);
      setTranscript("");

      mediaRecorderRef.current.ondataavailable = (e) => {
        audioChunksRef.current.push(e.data);
      };

      // Start the recorder and timer
      mediaRecorderRef.current.start(5000); // Collect data in 5-second chunks
      setIsRecording(true);
      
      // Start timer to track recording duration
      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
      
      toast({
        title: "Recording Started",
        description: "Listening to your call for analysis",
      });
    } catch (error) {
      console.error("Error starting recording:", error);
      toast({
        title: "Recording Failed",
        description: "Could not access microphone",
        variant: "destructive",
      });
    }
  };

  const stopRecording = async () => {
    if (mediaRecorderRef.current && isRecording) {
      // Stop the media recorder
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      
      // Stop the duration timer
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
      
      setIsRecording(false);
      
      toast({
        title: "Recording Stopped",
        description: "Analyzing your call...",
      });
      
      // Process the entire recording
      if (audioChunksRef.current.length > 0) {
        try {
          setProcessingChunk(true);
          const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
          const result = await transcribeAudio(audioBlob);
          
          if (result) {
            // Update the displayed transcript
            setTranscript(result.text);
            
            // Generate final suggestions
            const finalSuggestions = generateSuggestions(result.text);
            setSuggestions(finalSuggestions);
            
            // Save the full transcription with analysis
            const audioFileName = `Live Call ${new Date().toLocaleString()}`;
            await saveTranscriptionWithAnalysis(result.text, audioBlob, audioFileName);
            
            toast({
              title: "Analysis Complete",
              description: "Your call has been analyzed and saved",
            });
          }
        } catch (error) {
          console.error("Error processing final recording:", error);
          toast({
            title: "Analysis Failed",
            description: "Could not process the recording",
            variant: "destructive",
          });
        } finally {
          setProcessingChunk(false);
        }
      }
    }
  };

  const saveApiKey = () => {
    setOpenAIKey(apiKey);
    setHasApiKey(true);
    setOpenAPIKeyDialog(false);
    toast({
      title: "API Key Saved",
      description: "Your OpenAI API key has been saved",
    });
  };

  const goToSettings = () => {
    navigate("/settings");
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
  };

  return (
    <Card className="shadow-md">
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Mic className="h-5 w-5 text-blue-500" />
              Live Call Analysis
            </CardTitle>
            <CardDescription>
              Real-time coaching during active calls
            </CardDescription>
          </div>
          <Dialog open={openAPIKeyDialog} onOpenChange={setOpenAPIKeyDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" size="icon" onClick={() => hasApiKey ? goToSettings() : setOpenAPIKeyDialog(true)}>
                <Settings className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>OpenAI API Settings</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">OpenAI API Key</label>
                  <Input
                    type="password"
                    placeholder="sk-..."
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Your API key is stored locally and never sent to our servers
                  </p>
                </div>
                <DialogFooter>
                  <Button onClick={saveApiKey} className="flex-1">Save API Key</Button>
                  <Button onClick={goToSettings} variant="outline" className="flex-1">Go to Settings</Button>
                </DialogFooter>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {!hasApiKey && (
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-md p-3 mb-4">
              <p className="text-sm text-amber-800 dark:text-amber-200">
                To use Live Call Analysis, please set your OpenAI API key in settings first.
              </p>
              <Button variant="outline" size="sm" className="mt-2" onClick={goToSettings}>
                Go to Settings
              </Button>
            </div>
          )}
        
          <div className="flex justify-center items-center flex-col gap-2">
            <Button
              onClick={isRecording ? stopRecording : startRecording}
              disabled={!hasApiKey || processingChunk}
              className={`${isRecording ? "bg-red-500 hover:bg-red-600" : "bg-blue-500 hover:bg-blue-600"} text-white px-6 py-6 rounded-full h-auto`}
            >
              {isRecording ? (
                <MicOff className="h-8 w-8" />
              ) : (
                <Mic className="h-8 w-8" />
              )}
            </Button>
            
            {isRecording && (
              <div className="text-sm font-medium mt-2">
                Recording: {formatTime(recordingDuration)}
              </div>
            )}
            
            {processingChunk && (
              <div className="w-32 mt-2">
                <Progress className="h-1" value={undefined} />
              </div>
            )}
          </div>
          
          <div className="flex items-center justify-center h-8">
            {isRecording && <AIWaveform color="blue" barCount={20} className="h-full" />}
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
            <div className="p-4 border rounded-lg bg-muted/50 min-h-[200px] max-h-[300px] overflow-y-auto">
              <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Call Transcript
              </h3>
              <p className="text-sm">
                {transcript || "Transcript will appear here during recording..."}
              </p>
            </div>
            
            <div className="p-4 border border-blue-500/30 bg-blue-500/5 rounded-lg">
              <h3 className="text-sm font-medium mb-2 flex items-center gap-2 text-blue-500">
                <Zap className="h-4 w-4" />
                Live Suggestions
              </h3>
              <ul className="space-y-2">
                {suggestions.map((suggestion, i) => (
                  <li key={i} className="text-sm flex items-start gap-2">
                    <div className="w-1 h-1 rounded-full bg-blue-500 mt-2"></div>
                    <span>{suggestion}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default LiveCallAnalysis;
