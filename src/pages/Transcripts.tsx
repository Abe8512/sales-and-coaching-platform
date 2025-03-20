import React, { useContext, useEffect, useState, useRef, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { ThemeContext } from "@/App";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { getStoredTranscriptions, StoredTranscription, TranscriptSegment } from "@/services/WhisperService";
import { Search, Filter, Clock, ArrowUpDown, Download, RefreshCw, Calendar, Phone, FileCheck, Database } from "lucide-react";
import { format, parseISO } from "date-fns";
import BulkUploadButton from "@/components/BulkUpload/BulkUploadButton";
import BulkUploadModal from "@/components/BulkUpload/BulkUploadModal";
import TranscriptDetail from "@/components/Transcripts/TranscriptDetail";
import AIWaveform from "@/components/ui/AIWaveform";
import { supabase } from "@/integrations/supabase/client";
import BulkUploadHistory from "@/components/BulkUpload/BulkUploadHistory";
import { useCallTranscripts } from "@/services/CallTranscriptService";
import { useSharedFilters } from "@/contexts/SharedFilterContext";
import { Json } from "@/integrations/supabase/types";

// Define a type for database transcript format
interface DbTranscript {
  id: string;
  text: string;
  filename?: string;
  created_at: string;
  duration?: number;
  call_score?: number;
  sentiment?: string;
  keywords?: string[];
  transcript_segments?: TranscriptSegment[];
}

// Type guard to check if a transcript is from the database
function isDbTranscript(transcript: StoredTranscription | DbTranscript | Record<string, unknown>): transcript is DbTranscript {
  return transcript !== null && 
         typeof transcript === 'object' && 
         'created_at' in transcript && 
         'id' in transcript;
}

// Define interface for transcript segment from Json type
interface TranscriptSegmentFromJson {
  id?: number | string;
  start?: number | string;
  end?: number | string;
  text?: string;
  speaker?: string;
}

// Helper function to safely process transcript segments
function processTranscriptSegments(segments: Json | unknown | null): TranscriptSegment[] {
  // Return empty array for null/undefined
  if (!segments) return [];
  
  try {
    // If it's already an array, map it
    if (Array.isArray(segments)) {
      return segments.map(segment => ({
        id: typeof segment.id === 'number' ? segment.id : Number(segment.id) || 0,
        start: typeof segment.start === 'number' ? segment.start : Number(segment.start) || 0,
        end: typeof segment.end === 'number' ? segment.end : Number(segment.end) || 0,
        text: String(segment.text || ''),
        speaker: String(segment.speaker || '')
      }));
    }
    
    // If it's a string, try to parse it
    if (typeof segments === 'string') {
      try {
        const parsed = JSON.parse(segments);
        return processTranscriptSegments(parsed);
      } catch (e) {
        console.error('Failed to parse segments JSON string:', e);
        return [];
      }
    }
    
    // If it's a single object, wrap it in an array
    if (segments && typeof segments === 'object') {
      return [{
        id: 0,
        start: 0,
        end: 0,
        text: '',
        speaker: '',
        ...(segments as Record<string, unknown>)
      }];
    }
    
    // Default case: return empty array
    return [];
  } catch (error) {
    console.error('Error processing transcript segments:', error);
    return [];
  }
}

const Transcripts: React.FC = () => {
  const { isDarkMode } = useContext(ThemeContext);
  const [searchParams, setSearchParams] = useSearchParams();
  const transcriptId = searchParams.get('id');
  const [activeSource, setActiveSource] = useState<'db' | 'local'>('db');
  const [activeTranscript, setActiveTranscript] = useState<StoredTranscription | null>(null);
  const [transcripts, setTranscripts] = useState<StoredTranscription[]>([]);
  const [dbTranscripts, setDbTranscripts] = useState<DbTranscript[]>([]);
  const { transcripts: callTranscripts, loading: isLoading, error, fetchTranscripts: refetch } = useCallTranscripts();
  const { filters } = useSharedFilters();
  const [searchTerm, setSearchTerm] = useState("");
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  
  // Load transcriptions from storage and check for ID in URL parameters
  useEffect(() => {
    loadTranscriptions();
    
    if (transcriptId) {
      // Check if we have an active_transcript in localStorage that was set by WhisperButton
      const activeTranscriptJson = localStorage.getItem('active_transcript');
      if (activeTranscriptJson) {
        try {
          const parsedTranscript = JSON.parse(activeTranscriptJson);
          if (parsedTranscript.id === transcriptId) {
            console.log("Found active transcript in localStorage:", parsedTranscript);
            setActiveTranscript(parsedTranscript);
            // Clear the localStorage to avoid stale data
            localStorage.removeItem('active_transcript');
            return;
          }
        } catch (error) {
          console.error("Error parsing active transcript from localStorage:", error);
        }
      }
      
      // If no active_transcript in localStorage or ID doesn't match, check in local storage
      const transcript = transcripts.find(t => t.id === transcriptId);
      if (transcript) {
        console.log("Found transcript in local storage:", transcript);
        setActiveTranscript(transcript);
      } else {
        // Then check in database
        console.log("Transcript not found in local storage, checking database for ID:", transcriptId);
        fetchTranscriptById(transcriptId);
      }
    }
  }, [searchParams, transcripts]);
  
  const fetchTranscriptById = async (id: string) => {
    try {
      const { data, error } = await supabase
        .from('call_transcripts')
        .select('*')
        .eq('id', id)
        .single();
        
      if (error) throw error;
      
      if (data) {
        // Convert to StoredTranscription format
        const convertedTranscript: StoredTranscription = {
          id: data.id,
          text: data.text,
          filename: data.filename,
          date: data.created_at,
          duration: data.duration,
          callScore: data.call_score,
          // Fix the type error by checking if sentiment is one of the allowed values
          sentiment: (data.sentiment === 'positive' || data.sentiment === 'negative' || data.sentiment === 'neutral') 
            ? data.sentiment as 'positive' | 'neutral' | 'negative' 
            : 'neutral',
          keywords: data.keywords || [],
        };
        
        setActiveTranscript(convertedTranscript);
      }
    } catch (error) {
      console.error('Error fetching transcript:', error);
    }
  };
  
  const loadTranscriptions = async () => {
    // Set loading state
    const startLoading = true;
    
    // Get local data from storage
    const storedTranscriptions = getStoredTranscriptions();
    
    // Sort by date (newest first)
    const sorted = [...storedTranscriptions].sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    
    setTranscripts(sorted);
    
    // Get data from database
    try {
      const { data, error } = await supabase
        .from('call_transcripts')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      
      if (data) {
        try {
          // Need to handle the transcript_segments type properly
          const formattedData = data.map(item => {
            // Create a properly typed transcript object
            const transcript: DbTranscript = {
              id: item.id,
              text: item.text,
              filename: item.filename || undefined,
              created_at: item.created_at || new Date().toISOString(),
              duration: item.duration || undefined,
              call_score: item.call_score || undefined,
              sentiment: item.sentiment || undefined,
              keywords: item.keywords || undefined,
              // Process transcript segments using our helper function
              transcript_segments: processTranscriptSegments(item.transcript_segments)
            };
            
            return transcript;
          });
          
          setDbTranscripts(formattedData);
        } catch (err) {
          console.error('Error formatting transcript data:', err);
        }
      }
    } catch (error) {
      console.error('Error loading transcripts from DB:', error);
    } finally {
      // Finished loading
    }
  };
  
  // Filter transcripts based on search term, active tab, and active source
  const filteredTranscripts = activeSource === 'local' 
    ? transcripts.filter(transcript => {
        const matchesSearch = transcript.text.toLowerCase().includes(searchTerm.toLowerCase()) ||
                             (transcript.speakerName && transcript.speakerName.toLowerCase().includes(searchTerm.toLowerCase()));
        
        if (activeTab === "all") return matchesSearch;
        if (activeTab === "positive") return matchesSearch && transcript.sentiment === "positive";
        if (activeTab === "negative") return matchesSearch && transcript.sentiment === "negative";
        if (activeTab === "neutral") return matchesSearch && transcript.sentiment === "neutral";
        
        return matchesSearch;
      })
    : dbTranscripts.filter(transcript => {
        const matchesSearch = transcript.text.toLowerCase().includes(searchTerm.toLowerCase()) ||
                             (transcript.filename && transcript.filename.toLowerCase().includes(searchTerm.toLowerCase()));
        
        if (activeTab === "all") return matchesSearch;
        if (activeTab === "positive") return matchesSearch && transcript.sentiment === "positive";
        if (activeTab === "negative") return matchesSearch && transcript.sentiment === "negative";
        if (activeTab === "neutral") return matchesSearch && transcript.sentiment === "neutral";
        
        return matchesSearch;
      });
  
  // Format duration from seconds to minutes and seconds
  const formatDuration = (seconds?: number): string => {
    try {
      if (seconds === undefined || seconds === null) return "unknown";
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      return `${minutes}m ${remainingSeconds}s`;
    } catch (error) {
      console.error('Error formatting duration:', error);
      return "unknown";
    }
  };
  
  // Generate a speaker name if none exists
  const getSpeakerName = (transcript: StoredTranscription | null | undefined): string => {
    // Check if transcript or id is undefined/null
    if (!transcript || !transcript.id) {
      return "Unknown Speaker";
    }
    
    try {
      // Generate a random name if none exists
      const firstNames = ["Sarah", "Michael", "Emily", "David", "Jessica", "John", "Rachel", "Robert", "Linda", "William"];
      const lastNames = ["Johnson", "Chen", "Rodriguez", "Kim", "Wong", "Smith", "Brown", "Jones", "Miller", "Davis"];
      
      // Use the transcript ID as a seed for consistent naming
      const idSum = transcript.id.split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0);
      const firstName = firstNames[idSum % firstNames.length];
      const lastName = lastNames[(idSum * 13) % lastNames.length];
      
      return `${firstName} ${lastName}`;
    } catch (error) {
      console.error('Error generating speaker name:', error);
      return "Unknown Speaker";
    }
  };
  
  const handleTranscriptClick = (transcript: StoredTranscription | DbTranscript) => {
    if (activeSource === 'local') {
      const localTranscript = transcripts.find(t => t.id === transcript.id);
      setActiveTranscript(localTranscript || null);
    } else {
      // Check if this is a DB transcript
      if (isDbTranscript(transcript)) {
        // Convert DB transcript to StoredTranscription format with transcript segments
        const convertedTranscript: StoredTranscription = {
          id: transcript.id,
          text: transcript.text,
          filename: transcript.filename,
          date: transcript.created_at,
          duration: transcript.duration,
          callScore: transcript.call_score,
          sentiment: transcript.sentiment,
          keywords: transcript.keywords || [],
          transcript_segments: transcript.transcript_segments || [],
          // Add any missing required fields with defaults
          speakerName: transcript.filename?.split('.')[0] || 'Unknown Speaker'
        };
        
        console.log("Converting DB transcript to StoredTranscription format:", convertedTranscript);
        setActiveTranscript(convertedTranscript);
      } else {
        // It's already a StoredTranscription - make sure we log what's happening
        console.log("Setting active transcript from StoredTranscription:", transcript);
        setActiveTranscript(transcript);
      }
    }
    
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
                    {activeTranscript.filename 
                      ? activeTranscript.filename 
                      : `Call with ${getSpeakerName(activeTranscript)}`
                    } • {
                      activeTranscript.date
                        ? (() => {
                            try {
                              return format(parseISO(activeTranscript.date), 'PPp');
                            } catch (error) {
                              console.error('Error formatting date:', error);
                              return 'Unknown date';
                            }
                          })()
                        : 'Unknown date'
                    } • {formatDuration(activeTranscript.duration)}
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
            <Tabs defaultValue="transcripts">
              <TabsList>
                <TabsTrigger value="transcripts">All Transcripts</TabsTrigger>
                <TabsTrigger value="bulkuploads">Bulk Upload History</TabsTrigger>
              </TabsList>
              
              <TabsContent value="transcripts">
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex flex-col md:flex-row md:justify-between gap-4">
                      <div className="flex flex-col md:flex-row md:items-center gap-3">
                        <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
                          <TabsList>
                            <TabsTrigger value="all">All</TabsTrigger>
                            <TabsTrigger value="positive">Positive</TabsTrigger>
                            <TabsTrigger value="neutral">Neutral</TabsTrigger>
                            <TabsTrigger value="negative">Negative</TabsTrigger>
                          </TabsList>
                        </Tabs>
                        
                        <div className="relative">
                          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                          <Input
                            type="search"
                            placeholder="Search transcripts..."
                            className="pl-8 w-full md:w-[250px]"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                          />
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Tabs defaultValue="local" value={activeSource} onValueChange={(value) => setActiveSource(value as 'db' | 'local')}>
                          <TabsList>
                            <TabsTrigger value="local">
                              <Phone className="h-4 w-4 mr-2" />
                              Local Storage
                            </TabsTrigger>
                            <TabsTrigger value="database">
                              <Database className="h-4 w-4 mr-2" />
                              Database
                            </TabsTrigger>
                          </TabsList>
                        </Tabs>
                        
                        <Button variant="outline" size="sm">
                          <Filter className="h-4 w-4 mr-2" />
                          Filters
                        </Button>
                      </div>
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
                                <div className="font-medium">
                                  {activeSource === 'local' 
                                    ? getSpeakerName(transcript)
                                    : transcript.filename || 'Untitled Recording'
                                  }
                                </div>
                                <div className="text-sm text-muted-foreground flex items-center gap-2">
                                  <Calendar className="h-3 w-3" />
                                  {(() => {
                                    try {
                                      const dateStr = activeSource === 'local' ? transcript.date : transcript.created_at;
                                      return format(parseISO(dateStr), 'PPp');
                                    } catch (error) {
                                      console.error('Error formatting date in list:', error);
                                      return 'Unknown date';
                                    }
                                  })()}
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
                                    (activeSource === 'local' ? transcript.callScore : transcript.call_score || 0) >= 80 ? 'text-neon-green' : 
                                    (activeSource === 'local' ? transcript.callScore : transcript.call_score || 0) >= 60 ? 'text-neon-blue' : 'text-neon-red'
                                  }`}>
                                    {activeSource === 'local' ? transcript.callScore : transcript.call_score || 50}
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
              </TabsContent>
              
              <TabsContent value="bulkuploads">
                <BulkUploadHistory />
              </TabsContent>
            </Tabs>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Transcripts;
