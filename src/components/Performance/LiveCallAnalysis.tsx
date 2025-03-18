import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Mic, MicOff, MessageSquare, Settings, Zap, ToggleLeft, ToggleRight, UserCircle, Radio } from "lucide-react";
import { useWhisperService } from "@/services/WhisperService";
import AIWaveform from "../ui/AIWaveform";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { useNavigate } from "react-router-dom";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import LiveMetricsDisplay from "../CallAnalysis/LiveMetricsDisplay";
import CoachingAlerts from "../CallAnalysis/CoachingAlerts";
import KeywordInsights from "../CallAnalysis/KeywordInsights";
import { useCallMetricsStore } from "@/store/useCallMetricsStore";

const LiveCallAnalysis = () => {
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
  const [useLocalWhisper, setUseLocalWhisper] = useState(false);
  const [numSpeakers, setNumSpeakers] = useState(2);
  
  const { 
    isRecording, 
    callDuration, 
    isTalkingMap, 
    startRecording: startRecordingStore, 
    stopRecording: stopRecordingStore,
    updateKeyPhrases
  } = useCallMetricsStore();
  
  const realtimeTranscriptionRef = React.useRef<{ stop: () => void } | null>(null);
  
  const navigate = useNavigate();
  const { toast } = useToast();
  const { 
    transcribeAudio, 
    saveTranscriptionWithAnalysis, 
    setOpenAIKey, 
    setUseLocalWhisper: saveUseLocalWhisperSetting, 
    getUseLocalWhisper,
    setNumSpeakers: saveNumSpeakers,
    getNumSpeakers,
    startRealtimeTranscription
  } = useWhisperService();

  useEffect(() => {
    const storedKey = localStorage.getItem("openai_api_key");
    if (storedKey) {
      setHasApiKey(true);
      setApiKey(storedKey);
    }
    
    setUseLocalWhisper(getUseLocalWhisper());
    setNumSpeakers(getNumSpeakers());
    
    return () => {
      if (realtimeTranscriptionRef.current) {
        realtimeTranscriptionRef.current.stop();
      }
    };
  }, [getUseLocalWhisper, getNumSpeakers]);

  const generateSuggestions = (text: string) => {
    const newSuggestions = [];
    
    if (text.toLowerCase().includes('price') || text.toLowerCase().includes('cost')) {
      newSuggestions.push("Focus on value proposition rather than price");
      updateKeyPhrases("pricing");
    }
    
    if (text.toLowerCase().includes('competitor') || text.toLowerCase().includes('alternative')) {
      newSuggestions.push("Highlight our unique features like [feature] that competitors don't have");
      updateKeyPhrases("competitors");
    }
    
    if (text.toLowerCase().includes('think') || text.toLowerCase().includes('consider')) {
      newSuggestions.push("Ask 'What would make this decision easier for you?'");
      updateKeyPhrases("consideration");
    }
    
    if (text.toLowerCase().includes('not sure') || text.toLowerCase().includes('uncertain')) {
      newSuggestions.push("Share a relevant case study to build confidence");
      updateKeyPhrases("uncertainty");
    }

    if (text.toLowerCase().includes('timeline') || text.toLowerCase().includes('when')) {
      newSuggestions.push("Suggest a concrete next step with a specific date");
      updateKeyPhrases("timeline");
    }
    
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
    if (!hasApiKey && !useLocalWhisper) {
      toast({
        title: "Configuration Required",
        description: "Please set your OpenAI API key or enable local Whisper in settings",
        variant: "destructive",
      });
      return;
    }

    try {
      startRecordingStore();
      
      setTranscript("");
      
      toast({
        title: "Recording Started",
        description: "Listening to your call for analysis",
      });
      
      realtimeTranscriptionRef.current = await startRealtimeTranscription(
        (newTranscript) => {
          setTranscript(newTranscript);
          const newSuggestions = generateSuggestions(newTranscript);
          setSuggestions(newSuggestions);
        },
        (error) => {
          toast({
            title: "Transcription Error",
            description: error,
            variant: "destructive",
          });
        }
      );
    } catch (error) {
      console.error("Error starting recording:", error);
      toast({
        title: "Recording Failed",
        description: "Could not access microphone",
        variant: "destructive",
      });
      stopRecordingStore();
      if (realtimeTranscriptionRef.current) {
        realtimeTranscriptionRef.current.stop();
        realtimeTranscriptionRef.current = null;
      }
    }
  };

  const stopRecording = async () => {
    if (isRecording) {
      if (realtimeTranscriptionRef.current) {
        realtimeTranscriptionRef.current.stop();
        realtimeTranscriptionRef.current = null;
      }
      
      stopRecordingStore();
      
      toast({
        title: "Recording Stopped",
        description: "Finalizing your call analysis"
      });
      
      try {
        if (transcript) {
          const audioFileName = `Live Call ${new Date().toLocaleString()}`;
          await saveTranscriptionWithAnalysis(transcript, undefined, audioFileName);
          
          toast({
            title: "Analysis Complete",
            description: "Your call has been analyzed and saved",
          });
        }
      } catch (error) {
        console.error("Error saving final transcript:", error);
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
  
  const updateNumSpeakers = (value: string) => {
    const num = parseInt(value, 10);
    setNumSpeakers(num);
    saveNumSpeakers(num);
    toast({
      title: "Speakers Updated",
      description: `Set to ${num} speakers for diarization`,
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

  const toggleLocalWhisper = (checked: boolean) => {
    setUseLocalWhisper(checked);
    saveUseLocalWhisperSetting(checked);
    toast({
      title: checked ? "Local Whisper Enabled" : "OpenAI API Mode",
      description: checked 
        ? "Transcription will run locally in your browser" 
        : "Transcription will use the OpenAI API",
    });
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
                <DialogTitle>Call Analysis Settings</DialogTitle>
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
                <div className="flex items-center justify-between space-y-0 pt-2">
                  <Label htmlFor="local-whisper">Use Local Whisper (No API Key Required)</Label>
                  <Switch
                    id="local-whisper"
                    checked={useLocalWhisper}
                    onCheckedChange={toggleLocalWhisper}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Local Whisper runs directly in your browser. It's a bit slower but doesn't require an API key.
                </p>
                
                <div className="space-y-2 pt-2">
                  <Label htmlFor="num-speakers">Number of Speakers</Label>
                  <Select 
                    value={numSpeakers.toString()} 
                    onValueChange={updateNumSpeakers}
                  >
                    <SelectTrigger id="num-speakers">
                      <SelectValue placeholder="Select number of speakers" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 Speaker</SelectItem>
                      <SelectItem value="2">2 Speakers</SelectItem>
                      <SelectItem value="3">3 Speakers</SelectItem>
                      <SelectItem value="4">4 Speakers</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Helps with speaker identification in transcripts
                  </p>
                </div>
                
                <DialogFooter>
                  <Button onClick={saveApiKey} className="flex-1" disabled={useLocalWhisper && !apiKey.trim()}>Save Settings</Button>
                  <Button onClick={goToSettings} variant="outline" className="flex-1">Go to Settings</Button>
                </DialogFooter>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {!hasApiKey && !useLocalWhisper && (
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-md p-3 mb-4">
              <p className="text-sm text-amber-800 dark:text-amber-200">
                To use Live Call Analysis, please set your OpenAI API key in settings or enable local Whisper transcription.
              </p>
              <div className="flex flex-wrap gap-2 mt-2">
                <Button variant="outline" size="sm" onClick={goToSettings}>
                  Go to Settings
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => {
                    toggleLocalWhisper(true);
                    toast({
                      title: "Local Whisper Enabled",
                      description: "You can now record without an API key"
                    });
                  }}
                >
                  Enable Local Whisper
                </Button>
              </div>
            </div>
          )}
        
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Switch
                id="use-local-whisper"
                checked={useLocalWhisper}
                onCheckedChange={toggleLocalWhisper}
              />
              <Label htmlFor="use-local-whisper" className="text-sm">
                {useLocalWhisper ? (
                  <span className="flex items-center">
                    <ToggleRight className="h-4 w-4 mr-1 text-green-500" /> 
                    Local Whisper Enabled
                  </span>
                ) : (
                  <span className="flex items-center">
                    <ToggleLeft className="h-4 w-4 mr-1 text-gray-500" /> 
                    Using OpenAI API
                  </span>
                )}
              </Label>
            </div>
            
            <div className="flex items-center space-x-3">
              <Radio className="h-4 w-4 text-blue-500" />
              <span className="text-sm">
                Speakers: {numSpeakers}
              </span>
            </div>
          </div>
          
          {isRecording && (
            <LiveMetricsDisplay />
          )}
          
          <div className="flex justify-center items-center flex-col gap-2 mt-4">
            <Button
              onClick={isRecording ? stopRecording : startRecording}
              disabled={(!hasApiKey && !useLocalWhisper) || processingChunk}
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
                Recording: {formatTime(callDuration)}
              </div>
            )}
            
            {processingChunk && (
              <div className="w-32 mt-2">
                <Progress className="h-1" value={undefined} />
              </div>
            )}
          </div>
          
          {isRecording && (
            <div className="flex items-center justify-center gap-6 py-2">
              <div className="flex flex-col items-center">
                <div className={`w-8 h-8 rounded-full ${isTalkingMap.agent ? "bg-blue-500" : "bg-blue-200"} flex items-center justify-center`}>
                  <UserCircle className="h-5 w-5 text-white" />
                </div>
                <span className="text-xs mt-1">Agent</span>
                {isTalkingMap.agent && <AIWaveform color="blue" barCount={5} className="h-3 mt-1" />}
              </div>
              
              <div className="flex flex-col items-center">
                <div className={`w-8 h-8 rounded-full ${isTalkingMap.customer ? "bg-pink-500" : "bg-pink-200"} flex items-center justify-center`}>
                  <UserCircle className="h-5 w-5 text-white" />
                </div>
                <span className="text-xs mt-1">Customer</span>
                {isTalkingMap.customer && <AIWaveform color="pink" barCount={5} className="h-3 mt-1" />}
              </div>
            </div>
          )}
          
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

          {isRecording && (
            <KeywordInsights />
          )}

          <CoachingAlerts />
        </div>
      </CardContent>
    </Card>
  );
};

export default LiveCallAnalysis;
