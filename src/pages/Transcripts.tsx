
import React, { useContext, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { ThemeContext } from "@/App";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { getStoredTranscriptions, StoredTranscription } from "@/services/WhisperService";
import { Search, Filter, Clock, ArrowUpDown, Download, RefreshCw, Calendar, Phone, FileCheck } from "lucide-react";
import { format, parseISO } from "date-fns";
import BulkUploadButton from "@/components/BulkUpload/BulkUploadButton";
import BulkUploadModal from "@/components/BulkUpload/BulkUploadModal";
import TranscriptDetail from "@/components/Transcripts/TranscriptDetail";
import AIWaveform from "@/components/ui/AIWaveform";

const Transcripts = () => {
  const { isDarkMode } = useContext(ThemeContext);
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTranscript, setActiveTranscript] = useState<StoredTranscription | null>(null);
  const [transcripts, setTranscripts] = useState<StoredTranscription[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  
  // Load transcriptions from storage and check for ID in URL parameters
  useEffect(() => {
    loadTranscriptions();
    
    const transcriptId = searchParams.get("id");
    if (transcriptId) {
      const transcript = transcripts.find(t => t.id === transcriptId);
      if (transcript) {
        setActiveTranscript(transcript);
      }
    }
  }, [searchParams]);
  
  const loadTranscriptions = () => {
    setIsLoading(true);
    // Get real data from storage
    const storedTranscriptions = getStoredTranscriptions();
    
    // Sort by date (newest first)
    const sorted = [...storedTranscriptions].sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    
    setTranscripts(sorted);
    setIsLoading(false);
  };
  
  // Filter transcripts based on search term and active tab
  const filteredTranscripts = transcripts.filter(transcript => {
    const matchesSearch = transcript.text.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (transcript.speakerName && transcript.speakerName.toLowerCase().includes(searchTerm.toLowerCase()));
    
    if (activeTab === "all") return matchesSearch;
    if (activeTab === "positive") return matchesSearch && transcript.sentiment === "positive";
    if (activeTab === "negative") return matchesSearch && transcript.sentiment === "negative";
    if (activeTab === "neutral") return matchesSearch && transcript.sentiment === "neutral";
    
    return matchesSearch;
  });
  
  // Format duration from seconds to minutes and seconds
  const formatDuration = (seconds?: number): string => {
    if (!seconds) return "unknown";
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };
  
  // Generate a speaker name if none exists
  const getSpeakerName = (transcript: StoredTranscription): string => {
    if (transcript.speakerName) return transcript.speakerName;
    
    // Generate a random name if none exists
    const firstNames = ["Sarah", "Michael", "Emily", "David", "Jessica", "John", "Rachel", "Robert", "Linda", "William"];
    const lastNames = ["Johnson", "Chen", "Rodriguez", "Kim", "Wong", "Smith", "Brown", "Jones", "Miller", "Davis"];
    
    // Use the transcript ID as a seed for consistent naming
    const idSum = transcript.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const firstName = firstNames[idSum % firstNames.length];
    const lastName = lastNames[(idSum * 13) % lastNames.length];
    
    return `${firstName} ${lastName}`;
  };
  
  const handleTranscriptClick = (transcript: StoredTranscription) => {
    setActiveTranscript(transcript);
    setSearchParams({ id: transcript.id });
  };
  
  const handleRefresh = () => {
    loadTranscriptions();
  };
  
  return (
    <DashboardLayout>
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold">Call Transcripts</h1>
            <p className="text-muted-foreground">
              Review, analyze and search through your call transcriptions
            </p>
          </div>
          
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="icon"
              onClick={handleRefresh}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            </Button>
            <BulkUploadButton onClick={() => setIsBulkUploadOpen(true)} />
          </div>
        </div>
        
        <BulkUploadModal 
          isOpen={isBulkUploadOpen} 
          onClose={() => setIsBulkUploadOpen(false)} 
        />
        
        {activeTranscript ? (
          <div className="grid grid-cols-1 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div>
                  <CardTitle>Transcript Details</CardTitle>
                  <CardDescription>
                    Call with {getSpeakerName(activeTranscript)} • {format(parseISO(activeTranscript.date), 'PPp')} • {formatDuration(activeTranscript.duration)}
                  </CardDescription>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => {
                    setActiveTranscript(null);
                    setSearchParams({});
                  }}
                >
                  Back to List
                </Button>
              </CardHeader>
              <CardContent>
                <TranscriptDetail transcript={activeTranscript} />
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
                      <TabsList>
                        <TabsTrigger value="all">All Calls</TabsTrigger>
                        <TabsTrigger value="positive">Positive</TabsTrigger>
                        <TabsTrigger value="neutral">Neutral</TabsTrigger>
                        <TabsTrigger value="negative">Negative</TabsTrigger>
                      </TabsList>
                    </Tabs>
                    
                    <div className="relative ml-4">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="search"
                        placeholder="Search transcripts..."
                        className="pl-8 w-[250px]"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                  </div>
                  
                  <Button variant="outline" size="sm">
                    <Filter className="h-4 w-4 mr-2" />
                    Filters
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {filteredTranscripts.length > 0 ? (
                  <div className="space-y-2">
                    {filteredTranscripts.map((transcript) => (
                      <div 
                        key={transcript.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent cursor-pointer"
                        onClick={() => handleTranscriptClick(transcript)}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full ${
                            transcript.sentiment === 'positive' ? 'bg-neon-green/20' : 
                            transcript.sentiment === 'negative' ? 'bg-neon-red/20' : 'bg-neon-blue/20'
                          } flex items-center justify-center`}>
                            <Phone className={`h-5 w-5 ${
                              transcript.sentiment === 'positive' ? 'text-neon-green' : 
                              transcript.sentiment === 'negative' ? 'text-neon-red' : 'text-neon-blue'
                            }`} />
                          </div>
                          <div>
                            <div className="font-medium">{getSpeakerName(transcript)}</div>
                            <div className="text-sm text-muted-foreground flex items-center gap-2">
                              <Calendar className="h-3 w-3" />
                              {format(parseISO(transcript.date), 'PPp')}
                              <span>•</span>
                              <Clock className="h-3 w-3" />
                              {formatDuration(transcript.duration)}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <AIWaveform 
                              barCount={5} 
                              color={
                                transcript.sentiment === 'positive' ? "green" : 
                                transcript.sentiment === 'negative' ? "pink" : "blue"
                              } 
                              className="h-6" 
                            />
                            <div className="text-sm">
                              Score: <span className={`font-medium ${
                                (transcript.callScore || 0) >= 80 ? 'text-neon-green' : 
                                (transcript.callScore || 0) >= 60 ? 'text-neon-blue' : 'text-neon-red'
                              }`}>
                                {transcript.callScore || 50}
                              </span>
                            </div>
                          </div>
                          
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-neon-blue hover:text-neon-blue/80 hover:bg-neon-blue/10"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleTranscriptClick(transcript);
                            }}
                          >
                            <FileCheck className="h-4 w-4 mr-1" />
                            View
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-10">
                    <FileCheck className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-30" />
                    <h3 className="text-lg font-medium mb-2">No transcripts found</h3>
                    <p className="text-muted-foreground mb-4">
                      {searchTerm ? "No results match your search criteria." : "Upload audio files to see transcripts here."}
                    </p>
                    <BulkUploadButton onClick={() => setIsBulkUploadOpen(true)} />
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Transcripts;
