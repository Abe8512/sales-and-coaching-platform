
import React, { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Mic, MicOff, MessageSquare, Settings, Zap } from "lucide-react";
import { useWhisperService, setOpenAIKey } from "@/services/WhisperService";
import AIWaveform from "../ui/AIWaveform";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useNavigate } from "react-router-dom";

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
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { transcribeAudio } = useWhisperService();

  useEffect(() => {
    // Check if API key exists in localStorage
    const storedKey = localStorage.getItem("openai_api_key");
    if (storedKey) {
      setHasApiKey(true);
      setOpenAIKey(storedKey);
    }
  }, []);

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

      mediaRecorderRef.current.ondataavailable = (e) => {
        audioChunksRef.current.push(e.data);
      };

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const result = await transcribeAudio(audioBlob);
        
        if (result) {
          setTranscript(prev => prev + " " + result.text);
          // Here we'd normally send the transcript to an AI for analysis
          // Mock response for now
          setSuggestions([
            "Notice the customer mentioned price concerns - try emphasizing value",
            "Good opportunity to mention our case studies for social proof",
            "Consider asking about their timeline for implementation"
          ]);
        }
      };

      mediaRecorderRef.current.start(10000); // Record in 10-second chunks
      setIsRecording(true);
      
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

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
      
      toast({
        title: "Recording Stopped",
        description: "Analyzing your call...",
      });
    }
  };

  const saveApiKey = () => {
    setOpenAIKey(apiKey);
    localStorage.setItem("openai_api_key", apiKey);
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

  return (
    <Card className="shadow-md">
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Mic className="h-5 w-5 text-neon-blue" />
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
                <div className="flex gap-2">
                  <Button onClick={saveApiKey} className="flex-1">Save API Key</Button>
                  <Button onClick={goToSettings} variant="outline" className="flex-1">Go to Settings</Button>
                </div>
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
        
          <div className="flex justify-center">
            <Button
              onClick={isRecording ? stopRecording : startRecording}
              disabled={!hasApiKey}
              className={`${isRecording ? "bg-red-500 hover:bg-red-600" : "bg-neon-blue hover:bg-neon-blue/80"} text-white px-6 py-6 rounded-full h-auto`}
            >
              {isRecording ? (
                <MicOff className="h-8 w-8" />
              ) : (
                <Mic className="h-8 w-8" />
              )}
            </Button>
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
            
            <div className="p-4 border border-neon-blue/30 bg-neon-blue/5 rounded-lg">
              <h3 className="text-sm font-medium mb-2 flex items-center gap-2 text-neon-blue">
                <Zap className="h-4 w-4" />
                Live Suggestions
              </h3>
              <ul className="space-y-2">
                {suggestions.map((suggestion, i) => (
                  <li key={i} className="text-sm flex items-start gap-2">
                    <div className="w-1 h-1 rounded-full bg-neon-blue mt-2"></div>
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
