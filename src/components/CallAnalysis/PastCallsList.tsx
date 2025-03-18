
import React, { useEffect } from 'react';
import { format } from 'date-fns';
import { useCallMetricsStore } from '@/store/useCallMetricsStore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Clock, Mic, BarChart2 } from "lucide-react";

const PastCallsList = () => {
  const { callHistory, loadPastCalls } = useCallMetricsStore();
  
  useEffect(() => {
    loadPastCalls();
  }, [loadPastCalls]);
  
  // Format duration from seconds to mm:ss
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  // Format date
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM d, yyyy h:mm a');
    } catch (error) {
      return dateString;
    }
  };
  
  // Calculate average sentiment score
  const getAverageSentiment = (sentiment: { agent: number; customer: number }) => {
    return (sentiment.agent + sentiment.customer) / 2;
  };
  
  // Get sentiment color
  const getSentimentColor = (score: number) => {
    if (score > 0.66) return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
    if (score > 0.33) return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300";
    return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl font-semibold">Past Calls</CardTitle>
        <CardDescription>
          Recent call recordings and metrics
        </CardDescription>
      </CardHeader>
      <CardContent>
        {callHistory.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>No past calls recorded yet.</p>
            <p className="text-sm mt-2">Start recording a call to see data here.</p>
          </div>
        ) : (
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-4">
              {callHistory.map((call) => (
                <Card key={call.id} className="bg-muted/40">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="font-medium">Call {call.id.substring(0, 8)}</h4>
                        <p className="text-sm text-muted-foreground">{formatDate(call.date)}</p>
                      </div>
                      <Badge className={getSentimentColor(getAverageSentiment(call.sentiment))}>
                        {getAverageSentiment(call.sentiment) > 0.66 ? 'Positive' : 
                         getAverageSentiment(call.sentiment) > 0.33 ? 'Neutral' : 'Negative'}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 mt-3">
                      <div className="flex items-center">
                        <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                        <span className="text-sm">
                          Duration: {formatDuration(call.duration)}
                        </span>
                      </div>
                      
                      <div className="flex items-center">
                        <Mic className="h-4 w-4 mr-2 text-muted-foreground" />
                        <span className="text-sm">
                          Talk ratio: {Math.round(call.talkRatio.agent)}% / {Math.round(call.talkRatio.customer)}%
                        </span>
                      </div>
                    </div>
                    
                    {call.keyPhrases.length > 0 && (
                      <div className="mt-3">
                        <h5 className="text-sm font-medium mb-1 flex items-center">
                          <BarChart2 className="h-3 w-3 mr-1" />
                          Key Phrases
                        </h5>
                        <div className="flex flex-wrap gap-1">
                          {call.keyPhrases.map((phrase, i) => (
                            <Badge key={i} variant="outline" className="text-xs">
                              {phrase}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};

export default PastCallsList;
