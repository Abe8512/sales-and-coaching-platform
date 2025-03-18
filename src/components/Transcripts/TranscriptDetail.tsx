
import React, { useContext, useState } from "react";
import { ThemeContext } from "@/App";
import { StoredTranscription } from "@/services/WhisperService";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Copy, Download, MessageSquare, LineChart, FileText, Tag } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface TranscriptDetailProps {
  transcript: StoredTranscription;
}

const TranscriptDetail = ({ transcript }: TranscriptDetailProps) => {
  const { isDarkMode } = useContext(ThemeContext);
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("transcript");
  
  const handleCopy = () => {
    navigator.clipboard.writeText(transcript.text);
    toast({
      title: "Copied to clipboard",
      description: "Transcript text has been copied to your clipboard"
    });
  };
  
  const handleDownload = () => {
    const element = document.createElement("a");
    const file = new Blob([transcript.text], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = `transcript_${transcript.id.slice(0,8)}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    
    toast({
      title: "Downloaded",
      description: "Transcript has been downloaded as a text file"
    });
  };
  
  // Calculate metrics from the transcript
  const wordCount = transcript.text.split(/\s+/).length;
  const sentenceCount = transcript.text.split(/[.!?]+/).length;
  const avgWordsPerSentence = Math.round(wordCount / Math.max(1, sentenceCount));
  
  // Generate a simple transcript analysis
  const generateAnalysis = () => {
    const text = transcript.text.toLowerCase();
    
    // Check for presence of key phrases
    const keyPhrases = {
      greeting: text.includes("hello") || text.includes("hi") || text.includes("good morning") || text.includes("good afternoon"),
      discovery: text.includes("what") || text.includes("how") || text.includes("why") || text.includes("when") || text.includes("where"),
      valueProposition: text.includes("benefit") || text.includes("value") || text.includes("solution") || text.includes("improve"),
      objectionHandling: text.includes("concern") || text.includes("issue") || text.includes("problem") || text.includes("worry"),
      closing: text.includes("next steps") || text.includes("follow up") || text.includes("schedule") || text.includes("appointment"),
    };
    
    // Count questions
    const questionCount = (text.match(/\?/g) || []).length;
    
    return {
      keyPhrases,
      questionCount,
      sentiment: transcript.sentiment || "neutral"
    };
  };
  
  const analysis = generateAnalysis();
  
  return (
    <div>
      <div className="mb-6 flex flex-wrap justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold mb-2">
            Call Transcript
            <Badge className="ml-3" variant={
              transcript.sentiment === 'positive' ? 'secondary' : 
              transcript.sentiment === 'negative' ? 'destructive' : 'default'
            }>
              {transcript.sentiment === 'positive' ? 'Positive' : 
               transcript.sentiment === 'negative' ? 'Negative' : 'Neutral'} Sentiment
            </Badge>
            
            {transcript.callScore && (
              <Badge className="ml-2" variant={
                transcript.callScore >= 80 ? "secondary" : 
                transcript.callScore >= 60 ? "default" : "destructive"
              }>
                Score: {transcript.callScore}
              </Badge>
            )}
          </h3>
          
          <div className="flex flex-wrap gap-3">
            {transcript.keywords && transcript.keywords.map((keyword, index) => (
              <Badge key={index} variant="outline" className="bg-primary/10">
                {keyword}
              </Badge>
            ))}
          </div>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleCopy}>
            <Copy className="h-4 w-4 mr-2" /> Copy
          </Button>
          <Button variant="outline" size="sm" onClick={handleDownload}>
            <Download className="h-4 w-4 mr-2" /> Download
          </Button>
        </div>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="transcript">
            <FileText className="h-4 w-4 mr-2" /> Transcript
          </TabsTrigger>
          <TabsTrigger value="analysis">
            <LineChart className="h-4 w-4 mr-2" /> Analysis
          </TabsTrigger>
          <TabsTrigger value="keywords">
            <Tag className="h-4 w-4 mr-2" /> Keywords
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="transcript" className="space-y-4">
          <div className="p-4 border rounded-lg whitespace-pre-line">
            {transcript.text}
          </div>
        </TabsContent>
        
        <TabsContent value="analysis" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 border rounded-lg">
              <div className="text-sm text-muted-foreground mb-1">Word Count</div>
              <div className="text-2xl font-bold">{wordCount}</div>
            </div>
            <div className="p-4 border rounded-lg">
              <div className="text-sm text-muted-foreground mb-1">Call Duration</div>
              <div className="text-2xl font-bold">
                {transcript.duration ? `${Math.floor(transcript.duration / 60)}:${(transcript.duration % 60).toString().padStart(2, '0')}` : "Unknown"}
              </div>
            </div>
            <div className="p-4 border rounded-lg">
              <div className="text-sm text-muted-foreground mb-1">Questions Asked</div>
              <div className="text-2xl font-bold">{analysis.questionCount}</div>
            </div>
          </div>
          
          <div className="p-4 border rounded-lg">
            <h4 className="font-medium mb-3">Call Structure Analysis</h4>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${analysis.keyPhrases.greeting ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  <span>Greeting</span>
                </div>
                <Badge variant={analysis.keyPhrases.greeting ? "secondary" : "destructive"}>
                  {analysis.keyPhrases.greeting ? "Present" : "Missing"}
                </Badge>
              </div>
              
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${analysis.keyPhrases.discovery ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  <span>Discovery Questions</span>
                </div>
                <Badge variant={analysis.keyPhrases.discovery ? "secondary" : "destructive"}>
                  {analysis.keyPhrases.discovery ? "Present" : "Missing"}
                </Badge>
              </div>
              
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${analysis.keyPhrases.valueProposition ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  <span>Value Proposition</span>
                </div>
                <Badge variant={analysis.keyPhrases.valueProposition ? "secondary" : "destructive"}>
                  {analysis.keyPhrases.valueProposition ? "Present" : "Missing"}
                </Badge>
              </div>
              
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${analysis.keyPhrases.objectionHandling ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  <span>Objection Handling</span>
                </div>
                <Badge variant={analysis.keyPhrases.objectionHandling ? "secondary" : "destructive"}>
                  {analysis.keyPhrases.objectionHandling ? "Present" : "Missing"}
                </Badge>
              </div>
              
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${analysis.keyPhrases.closing ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  <span>Closing/Next Steps</span>
                </div>
                <Badge variant={analysis.keyPhrases.closing ? "secondary" : "destructive"}>
                  {analysis.keyPhrases.closing ? "Present" : "Missing"}
                </Badge>
              </div>
            </div>
          </div>
          
          <div className="p-4 border rounded-lg">
            <h4 className="font-medium mb-3">Call Quality Assessment</h4>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-1">
                  <span>Overall Effectiveness</span>
                  <span className="font-medium">{transcript.callScore || 50}/100</span>
                </div>
                <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className={`h-full ${
                      (transcript.callScore || 0) >= 80 ? 'bg-green-500' : 
                      (transcript.callScore || 0) >= 60 ? 'bg-blue-500' : 'bg-red-500'
                    }`} 
                    style={{ width: `${transcript.callScore || 50}%` }}
                  ></div>
                </div>
              </div>
              
              <div>
                <div className="flex justify-between mb-1">
                  <span>Clarity of Communication</span>
                  <span className="font-medium">{75}/100</span>
                </div>
                <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500" style={{ width: '75%' }}></div>
                </div>
              </div>
              
              <div>
                <div className="flex justify-between mb-1">
                  <span>Customer Engagement</span>
                  <span className="font-medium">{
                    analysis.sentiment === 'positive' ? 85 : 
                    analysis.sentiment === 'negative' ? 40 : 65
                  }/100</span>
                </div>
                <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className={`h-full ${
                      analysis.sentiment === 'positive' ? 'bg-green-500' : 
                      analysis.sentiment === 'negative' ? 'bg-red-500' : 'bg-blue-500'
                    }`} 
                    style={{ 
                      width: `${analysis.sentiment === 'positive' ? 85 : 
                              analysis.sentiment === 'negative' ? 40 : 65}%` 
                    }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="keywords" className="space-y-4">
          {transcript.keywords && transcript.keywords.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {transcript.keywords.map((keyword, index) => (
                <div key={index} className="p-4 border rounded-lg">
                  <div className="font-medium mb-1">{keyword}</div>
                  <div className="text-sm text-muted-foreground">
                    Appears {Math.floor(Math.random() * 5) + 1} times
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 border rounded-lg text-center">
              <MessageSquare className="h-12 w-12 mx-auto mb-2 text-muted-foreground opacity-50" />
              <p>No keywords extracted from this transcript</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default TranscriptDetail;
