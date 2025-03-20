import React, { useContext, useState, useEffect } from "react";
import { ThemeContext } from "@/App";
import { StoredTranscription } from "@/services/WhisperService";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Copy, Download, MessageSquare, LineChart, FileText, Tag, Clock, User, Smile, Frown, Meh } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useSentimentAnalysis, SentimentAnalysisResult } from '@/services/SentimentAnalysisService';
import { Skeleton } from '@/components/ui/skeleton';
import { BarChart } from '@/components/ui/bar-chart';
import { toast } from "sonner";

interface TranscriptDetailProps {
  transcript: StoredTranscription | null;
}

const TranscriptDetail: React.FC<TranscriptDetailProps> = ({ transcript }) => {
  const { isDarkMode } = useContext(ThemeContext);
  const [activeTab, setActiveTab] = useState("transcript");
  const [prevTranscriptId, setPrevTranscriptId] = useState<string | null>(null);
  const [sentimentAnalysis, setSentimentAnalysis] = useState<SentimentAnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const { analyzeCallSentiment } = useSentimentAnalysis();
  
  // Add detailed logging to help debug
  useEffect(() => {
    console.log("TranscriptDetail rendered with transcript:", transcript);
    
    // Log when we get a new transcript
    if (transcript?.id !== prevTranscriptId) {
      console.log("New transcript loaded:", transcript?.id);
      console.log("Previous transcript ID was:", prevTranscriptId);
      setPrevTranscriptId(transcript?.id || null);
      setSentimentAnalysis(null);
    }
    
    // Add warnings for missing critical fields
    if (transcript && !transcript.text) {
      console.warn("Warning: transcript.text is undefined");
    }
    
    if (transcript && (!transcript.transcript_segments || transcript.transcript_segments.length === 0)) {
      console.warn("Warning: transcript_segments is missing or empty");
    }
  }, [transcript, prevTranscriptId]);
  
  const handleCopyTranscript = () => {
    if (!transcript || !transcript.text) {
      toast.error("No transcript content available to copy");
      return;
    }
    
    navigator.clipboard.writeText(transcript.text)
      .then(() => {
        toast.success("Transcript copied to clipboard");
      })
      .catch((error) => {
        console.error("Failed to copy transcript:", error);
        toast.error("Failed to copy transcript");
      });
  };
  
  const handleDownloadTranscript = () => {
    if (!transcript || !transcript.text) {
      toast.error("No transcript content available to download");
      return;
    }
    
    try {
      const fileName = transcript.filename 
        ? transcript.filename.replace(/\.[^/.]+$/, ".txt") 
        : `transcript_${transcript.id}.txt`;
      
      const blob = new Blob([transcript.text], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      
      // Clean up
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success("Transcript downloaded successfully");
    } catch (error) {
      console.error("Failed to download transcript:", error);
      toast.error("Failed to download transcript");
    }
  };
  
  const generateAnalysis = () => {
    if (!transcript || !transcript.text) {
      console.warn("Cannot generate analysis: transcript or transcript.text is undefined");
      return {
        keyPhrases: [],
        questionCount: 0,
        sentiment: "neutral",
        wordCount: 0
      };
    }
    
    const text = transcript.text || "";
    
    // Generate key phrases based on frequency
    const words = text.toLowerCase().split(/\s+/);
    const wordCount = words.length;
    
    // Count sentences
    const sentences = text.split(/[.!?]+/).filter(Boolean);
    const sentenceCount = sentences.length;
    
    // Key phrases (simple implementation)
    const keyPhrases = [
      "product features",
      "customer support",
      "pricing options"
    ];
    
    // Count questions
    const questionCount = (text.match(/\?/g) || []).length;
    
    return {
      keyPhrases,
      questionCount,
      sentiment: transcript.sentiment || "neutral",
      wordCount
    };
  };
  
  const analysis = transcript ? generateAnalysis() : null;
  
  // Analyze sentiment when requested
  const handleAnalyzeSentiment = () => {
    if (!transcript) {
      toast.error("No transcript found to analyze");
      return;
    }
    
    setIsAnalyzing(true);
    
    analyzeCallSentiment(
      transcript.text,
      transcript.speakerName,
      transcript.customerName,
      transcript.id,
      transcript.duration
    )
      .then((result) => {
        setSentimentAnalysis(result);
        toast.success("Sentiment analysis completed");
      })
      .catch((error) => {
        console.error("Sentiment analysis failed:", error);
        toast.error("Failed to analyze sentiment");
      })
      .finally(() => {
        setIsAnalyzing(false);
      });
  };
  
  // Return an error state if transcript is undefined
  if (!transcript) {
    return (
      <div className="p-6 text-center">
        <h3 className="text-xl font-bold mb-4">Transcript Not Available</h3>
        <p className="text-muted-foreground">The transcript data could not be loaded or is missing.</p>
      </div>
    );
  }
  
  // Return a warning if transcript text is missing
  if (!transcript.text) {
    return (
      <div className="p-6 text-center">
        <h3 className="text-xl font-bold mb-4">Incomplete Transcript Data</h3>
        <p className="text-muted-foreground">The transcript text is missing or empty.</p>
        <div className="mt-4">
          <p>Transcript ID: {transcript.id}</p>
          <p>Available data: {Object.keys(transcript).filter(key => !!transcript[key]).join(', ')}</p>
        </div>
      </div>
    );
  }
  
  return (
    <div>
      <div className="mb-6 flex flex-wrap justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold mb-2">
            Call Transcript
            <Badge className="ml-3" variant={
              transcript?.sentiment === 'positive' ? 'secondary' : 
              transcript?.sentiment === 'negative' ? 'destructive' : 'default'
            }>
              {transcript?.sentiment === 'positive' ? 'Positive' : 
               transcript?.sentiment === 'negative' ? 'Negative' : 'Neutral'} Sentiment
            </Badge>
            
            {transcript?.callScore !== undefined && transcript?.callScore !== null && (
              <Badge className="ml-2" variant={
                transcript.callScore >= 80 ? "secondary" : 
                transcript.callScore >= 60 ? "default" : "destructive"
              }>
                Score: {transcript.callScore}
              </Badge>
            )}
          </h3>
          
          <div className="flex flex-wrap gap-3">
            {transcript?.keywords && transcript?.keywords.length > 0 && transcript?.keywords.map((keyword, index) => (
              <Badge key={index} variant="outline" className="bg-primary/10">
                {keyword}
              </Badge>
            ))}
          </div>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleCopyTranscript}
            className={isDarkMode ? "border-gray-700" : ""}
          >
            <Copy className="h-4 w-4 mr-2" />
            Copy Text
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleDownloadTranscript}
            className={isDarkMode ? "border-gray-700" : ""}
          >
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>
        </div>
      </div>
      
      <div className="text-sm font-medium mb-2 flex items-center">
        <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
        {transcript?.duration ? (
          <span>
            Duration: {Math.floor((transcript.duration || 0) / 60)}m {Math.round((transcript.duration || 0) % 60)}s
          </span>
        ) : (
          <span>Duration: Unknown</span>
        )}
        
        <span className="mx-2">•</span>
        
        <User className="h-4 w-4 mr-2 text-muted-foreground" />
        <span>Speaker: {transcript.speakerName || 'Unknown'}</span>
      </div>
      
      <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="transcript">Transcript</TabsTrigger>
          <TabsTrigger value="analysis" disabled={!sentimentAnalysis}>Analysis</TabsTrigger>
          <TabsTrigger value="visualization">Visualization</TabsTrigger>
        </TabsList>
        
        <TabsContent value="transcript" className="space-y-4">
          <ScrollArea className={`h-[500px] p-4 rounded-md ${isDarkMode ? "bg-gray-800/50" : "bg-gray-100"}`}>
            {transcript?.transcript_segments && transcript.transcript_segments.length > 0 ? (
              <div className="space-y-6">
                {transcript.transcript_segments.map((segment, index) => {
                  const speakerName = segment.speaker || (index % 2 === 0 ? "Agent" : "Customer");
                  
                  return (
                    <div key={index} className="space-y-1">
                      <div className="flex items-center">
                        <span className={`font-medium ${speakerName.toLowerCase().includes("agent") ? "text-blue-500" : "text-pink-500"}`}>
                          {speakerName}
                        </span>
                        <span className="text-xs text-muted-foreground ml-2">
                          {Math.floor(segment.start / 60)}:{Math.floor(segment.start % 60).toString().padStart(2, '0')}
                        </span>
                      </div>
                      <p>{segment.text}</p>
                    </div>
                  );
                })}
              </div>
            ) : (
              <pre className="whitespace-pre-wrap">{transcript.text}</pre>
            )}
          </ScrollArea>
        </TabsContent>
        
        <TabsContent value="analysis">
          {sentimentAnalysis ? (
            <div className="space-y-6">
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                <h3 className="text-lg font-medium mb-2">Summary</h3>
                <p>{sentimentAnalysis.summary}</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                  <h3 className="text-lg font-medium mb-2">Filler Words</h3>
                  {sentimentAnalysis.filler_words.total_count > 0 ? (
                    <>
                      <p className="mb-2">
                        <span className="font-bold">{sentimentAnalysis.filler_words.total_count}</span> filler words detected 
                        ({sentimentAnalysis.filler_words.frequency_per_minute.toFixed(1)} per minute)
                      </p>
                      <div className="h-40">
                        <BarChart 
                          data={sentimentAnalysis.filler_words.by_word}
                          index="name"
                          categories={["value"]}
                          colors={["blue"]}
                          valueFormatter={(value) => `${value} times`}
                        />
                      </div>
                    </>
                  ) : (
                    <p>No filler words detected.</p>
                  )}
                </div>
                
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                  <h3 className="text-lg font-medium mb-2">Confidence Issues</h3>
                  {sentimentAnalysis.confidence_issues.length > 0 ? (
                    <div className="max-h-40 overflow-y-auto">
                      <ul className="list-disc pl-5 space-y-2">
                        {sentimentAnalysis.confidence_issues.map((issue, index) => (
                          <li key={index}>
                            <p className="text-sm font-medium">{issue.text}</p>
                            <p className="text-xs text-gray-500">{issue.suggestion}</p>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <p>No confidence issues detected.</p>
                  )}
                </div>
                
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 md:col-span-2">
                  <h3 className="text-lg font-medium mb-2">Missed Opportunities</h3>
                  {sentimentAnalysis.missed_opportunities.length > 0 ? (
                    <div className="max-h-60 overflow-y-auto">
                      <ul className="space-y-4">
                        {sentimentAnalysis.missed_opportunities.map((opportunity, index) => (
                          <li key={index} className="border-l-4 border-blue-500 pl-4 py-1">
                            <p className="font-medium">{opportunity.opportunity_type}</p>
                            <p className="text-sm">{opportunity.text}</p>
                            <p className="text-sm font-medium text-blue-600 mt-1">{opportunity.suggestion}</p>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <p>No missed opportunities detected.</p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-8">
              <Skeleton className="h-8 w-full mb-4" />
              <Skeleton className="h-32 w-full mb-4" />
              <Skeleton className="h-20 w-full" />
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="visualization">
          {/* Rest of the component remains the same */}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default TranscriptDetail;
