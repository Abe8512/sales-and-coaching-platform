
import React, { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Filter, Download, FileAudio, Search, Clock, Star, RefreshCw } from "lucide-react";
import { getStoredTranscriptions, StoredTranscription } from "@/services/WhisperService";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import BulkUploadButton from "@/components/BulkUpload/BulkUploadButton";
import BulkUploadModal from "@/components/BulkUpload/BulkUploadModal";
import TranscriptDetail from "@/components/Transcripts/TranscriptDetail";
import { useToast } from "@/hooks/use-toast";

const Transcripts = () => {
  const { toast } = useToast();
  const [transcriptions, setTranscriptions] = useState<StoredTranscription[]>([]);
  const [filteredTranscriptions, setFilteredTranscriptions] = useState<StoredTranscription[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTranscript, setSelectedTranscript] = useState<StoredTranscription | null>(null);
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(false);
  
  // Check for API key
  useEffect(() => {
    const apiKey = localStorage.getItem("openai_api_key");
    setHasApiKey(Boolean(apiKey && apiKey.trim() !== ''));
  }, []);
  
  useEffect(() => {
    loadTranscriptions();
  }, []);
  
  const loadTranscriptions = () => {
    setIsLoading(true);
    const stored = getStoredTranscriptions();
    setTranscriptions(stored);
    setFilteredTranscriptions(stored);
    
    // Select the first transcript if available and none selected
    if (stored.length > 0 && !selectedTranscript) {
      setSelectedTranscript(stored[0]);
    }
    
    setIsLoading(false);
  };
  
  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredTranscriptions(transcriptions);
    } else {
      const filtered = transcriptions.filter(
        transcript => transcript.text.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredTranscriptions(filtered);
    }
  }, [searchTerm, transcriptions]);
  
  const handleRefresh = () => {
    setIsLoading(true);
    loadTranscriptions();
    toast({
      title: "Refreshed",
      description: "Transcriptions have been refreshed",
    });
  };
  
  const getSentimentColor = (sentiment?: 'positive' | 'neutral' | 'negative') => {
    switch (sentiment) {
      case 'positive': return "bg-green-500";
      case 'negative': return "bg-red-500";
      default: return "bg-amber-500";
    }
  };
  
  const getScoreColor = (score?: number) => {
    if (score === undefined) return "text-gray-500";
    if (score >= 80) return "text-green-500";
    if (score >= 60) return "text-amber-500";
    return "text-red-500";
  };
  
  const handleTranscriptEnd = () => {
    loadTranscriptions();
  };

  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-between sm:items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">Call Transcripts</h1>
            <p className="text-muted-foreground">
              Manage and analyze your call transcriptions
            </p>
          </div>
          
          <div className="flex flex-wrap gap-2">
            <div className="flex-1 relative min-w-[200px]">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search transcripts..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button variant="outline" size="icon" onClick={handleRefresh} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            </Button>
            <BulkUploadButton 
              onClick={() => {
                if (!hasApiKey) {
                  toast({
                    title: "API Key Required",
                    description: "Please set your OpenAI API key in Settings first", 
                    variant: "destructive",
                  });
                  return;
                }
                setIsBulkUploadOpen(true);
              }} 
            />
          </div>
        </div>
        
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <div className="col-span-1 xl:col-span-1">
            <Card>
              <CardHeader className="px-4 py-3">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-lg">All Transcripts</CardTitle>
                  <Badge variant="outline">{filteredTranscriptions.length}</Badge>
                </div>
                <CardDescription>
                  {filteredTranscriptions.length > 0 
                    ? "Select a transcript to view details"
                    : "Upload audio files to generate transcripts"}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y max-h-[calc(100vh-280px)] overflow-y-auto">
                  {filteredTranscriptions.length > 0 ? (
                    filteredTranscriptions.map((transcript) => (
                      <div 
                        key={transcript.id}
                        className={`p-4 cursor-pointer hover:bg-muted/50 transition-colors ${
                          selectedTranscript?.id === transcript.id ? "bg-muted" : ""
                        }`}
                        onClick={() => setSelectedTranscript(transcript)}
                      >
                        <div className="flex items-start gap-3">
                          <div className="mt-1">
                            <FileAudio className="h-4 w-4 text-blue-500" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <h3 className="text-sm font-medium truncate">
                                {transcript.filename || `Transcript ${transcript.id.slice(0, 6)}`}
                              </h3>
                              <div className={`w-2 h-2 rounded-full ${getSentimentColor(transcript.sentiment)}`}></div>
                            </div>
                            <p className="text-xs text-muted-foreground truncate mt-1">
                              {transcript.text.slice(0, 100)}...
                            </p>
                            <div className="flex justify-between items-center mt-2">
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Clock className="h-3 w-3" />
                                <span>{format(new Date(transcript.date), 'MMM d, yyyy')}</span>
                              </div>
                              <div className="flex items-center gap-1 text-xs font-medium">
                                <Star className="h-3 w-3" />
                                <span className={getScoreColor(transcript.callScore)}>
                                  {transcript.callScore || "N/A"}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="py-12 px-4 text-center">
                      <FileAudio className="mx-auto h-12 w-12 text-muted-foreground/50" />
                      <h3 className="mt-4 text-lg font-medium">No transcripts found</h3>
                      <p className="mt-2 text-sm text-muted-foreground">
                        {searchTerm ? "Try a different search term" : "Upload audio files to get started"}
                      </p>
                      {!searchTerm && (
                        <Button 
                          variant="outline" 
                          className="mt-4" 
                          onClick={() => {
                            if (!hasApiKey) {
                              toast({
                                title: "API Key Required",
                                description: "Please set your OpenAI API key in Settings first", 
                                variant: "destructive",
                              });
                              return;
                            }
                            setIsBulkUploadOpen(true);
                          }}
                        >
                          Upload Audio Files
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
          
          <div className="col-span-1 xl:col-span-2">
            {selectedTranscript ? (
              <TranscriptDetail transcript={selectedTranscript} />
            ) : (
              <Card className="flex items-center justify-center min-h-[400px] bg-muted/50">
                <div className="text-center p-6">
                  <FileAudio className="mx-auto h-12 w-12 text-muted-foreground/50" />
                  <h3 className="mt-4 text-lg font-medium">Select a transcript</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Choose a transcript from the list to view details and analysis
                  </p>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
      
      <BulkUploadModal 
        isOpen={isBulkUploadOpen} 
        onClose={() => {
          setIsBulkUploadOpen(false);
          loadTranscriptions();
        }} 
      />
    </DashboardLayout>
  );
};

export default Transcripts;
