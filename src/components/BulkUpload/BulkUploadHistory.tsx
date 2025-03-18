
import React, { useEffect } from 'react';
import { useBulkUploadService } from '@/services/BulkUploadService';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format, parseISO } from 'date-fns';
import { FileAudio, Clock, Search, CalendarClock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { ScrollArea } from '@/components/ui/scroll-area';

const BulkUploadHistory = () => {
  const { uploadHistory, hasLoadedHistory, loadUploadHistory } = useBulkUploadService();
  const navigate = useNavigate();
  
  useEffect(() => {
    if (!hasLoadedHistory) {
      loadUploadHistory();
    }
  }, [hasLoadedHistory, loadUploadHistory]);
  
  const formatDate = (dateString: string) => {
    try {
      return format(parseISO(dateString), 'PPp');
    } catch (e) {
      return dateString;
    }
  };
  
  const formatDuration = (seconds?: number) => {
    if (!seconds) return "unknown";
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };
  
  const getSentimentColor = (sentiment?: string) => {
    switch (sentiment) {
      case 'positive':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'negative':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      default:
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
    }
  };
  
  const viewTranscript = (id: string) => {
    navigate(`/transcripts?id=${id}`);
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Upload History</CardTitle>
      </CardHeader>
      <CardContent>
        {uploadHistory.length > 0 ? (
          <ScrollArea className="h-[400px] pr-2">
            <div className="space-y-3">
              {uploadHistory.map((transcript) => (
                <div 
                  key={transcript.id}
                  className="border rounded-lg p-4 hover:bg-accent transition-colors"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-3">
                      <FileAudio className="h-5 w-5 text-purple-500" />
                      <div>
                        <div className="font-medium">{transcript.filename || 'Untitled Recording'}</div>
                        <div className="text-sm text-muted-foreground flex items-center gap-2">
                          <CalendarClock className="h-3 w-3" />
                          {formatDate(transcript.created_at)}
                          <span>•</span>
                          <Clock className="h-3 w-3" />
                          {formatDuration(transcript.duration)}
                        </div>
                      </div>
                    </div>
                    <Badge className={getSentimentColor(transcript.sentiment)}>
                      {transcript.sentiment?.charAt(0).toUpperCase() + transcript.sentiment?.slice(1) || 'Unknown'}
                    </Badge>
                  </div>
                  
                  {transcript.keywords && transcript.keywords.length > 0 && (
                    <div className="mt-3">
                      <div className="text-sm mb-1">Keywords:</div>
                      <div className="flex flex-wrap gap-1">
                        {transcript.keywords.slice(0, 5).map((keyword, i) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            {keyword}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <div className="mt-3 text-sm text-muted-foreground line-clamp-2">
                    {transcript.text.substring(0, 150)}...
                  </div>
                  
                  <div className="mt-3 flex justify-end">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => viewTranscript(transcript.id)}
                    >
                      <Search className="h-4 w-4 mr-1" />
                      View Transcript
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        ) : (
          <div className="text-center py-10">
            <FileAudio className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-30" />
            <h3 className="text-lg font-medium mb-2">No upload history</h3>
            <p className="text-muted-foreground mb-4">
              Upload audio files to analyze and see them here.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default BulkUploadHistory;
