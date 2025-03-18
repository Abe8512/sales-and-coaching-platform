
import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StoredTranscription } from "@/services/WhisperService";
import { format } from "date-fns";
import { PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, BarChart, Bar, Legend } from "recharts";
import { Download, MessageSquare, ChevronDown, ChevronUp, Calendar, Clock, UserCircle, Star, Smile, Frown, Meh, BarChart2, Tag } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import GlowingCard from "@/components/ui/GlowingCard";

interface TranscriptDetailProps {
  transcript: StoredTranscription;
}

const TranscriptDetail: React.FC<TranscriptDetailProps> = ({ transcript }) => {
  const [expanded, setExpanded] = useState(false);
  
  // Generate data for sentiment analysis visualization
  const getSentimentData = () => {
    const sentimentScore = 
      transcript.sentiment === 'positive' ? 0.8 : 
      transcript.sentiment === 'negative' ? 0.2 : 
      0.5;
    
    return [
      { name: 'Positive', value: sentimentScore },
      { name: 'Negative', value: 1 - sentimentScore },
    ];
  };
  
  // Generate speaker activity data
  const getSpeakerActivityData = () => {
    // Simulate speaker activity percentages
    const rep = 35 + Math.floor(Math.random() * 15);
    const customer = 100 - rep;
    
    return [
      { name: 'Sales Rep', value: rep },
      { name: 'Customer', value: customer },
    ];
  };
  
  // Generate topic timeline data
  const getTopicTimelineData = () => {
    if (!transcript.text) return [];
    
    // Generate segments based on actual text
    const words = transcript.text.split(' ');
    const totalWords = words.length;
    const segments = 6;
    const segmentSize = Math.ceil(totalWords / segments);
    
    return Array.from({ length: segments }, (_, i) => {
      const segmentWords = words.slice(i * segmentSize, (i + 1) * segmentSize).join(' ');
      let topic = 'Other';
      
      // Determine topic based on keywords in text segment
      if (segmentWords.match(/price|cost|budget|afford/i)) topic = 'Pricing';
      else if (segmentWords.match(/feature|functionality|can it|does it/i)) topic = 'Features';
      else if (segmentWords.match(/when|delivery|timeline|available/i)) topic = 'Timeline';
      else if (segmentWords.match(/support|help|assistance|service/i)) topic = 'Support';
      else if (segmentWords.match(/compare|competitor|alternative|versus/i)) topic = 'Comparison';
      
      return {
        name: `${i + 1}`,
        Topic: topic,
        Engagement: Math.floor(50 + Math.random() * 50),
      };
    });
  };
  
  // Generate speaking rate data
  const getSpeakingRateData = () => {
    return [
      { name: '0:00', rate: 120 + Math.floor(Math.random() * 40) },
      { name: '1:00', rate: 120 + Math.floor(Math.random() * 40) },
      { name: '2:00', rate: 120 + Math.floor(Math.random() * 40) },
      { name: '3:00', rate: 120 + Math.floor(Math.random() * 40) },
      { name: '4:00', rate: 120 + Math.floor(Math.random() * 40) },
      { name: '5:00', rate: 120 + Math.floor(Math.random() * 40) },
    ];
  };
  
  const COLORS = ['#00C49F', '#FFBB28', '#FF8042', '#0088FE', '#FF8042'];
  
  const getSentimentIcon = () => {
    switch (transcript.sentiment) {
      case 'positive': return <Smile className="h-5 w-5 text-green-500" />;
      case 'negative': return <Frown className="h-5 w-5 text-red-500" />;
      default: return <Meh className="h-5 w-5 text-amber-500" />;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle>{transcript.filename || `Transcript ${transcript.id.slice(0, 6)}`}</CardTitle>
            <CardDescription>
              Detailed analysis of the call transcript
            </CardDescription>
          </div>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
        
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
          <div className="flex flex-col p-3 border rounded-lg">
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Calendar className="h-3 w-3" /> Date
            </span>
            <span className="text-sm font-medium mt-1">
              {format(new Date(transcript.date), 'MMM d, yyyy')}
            </span>
          </div>
          
          <div className="flex flex-col p-3 border rounded-lg">
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" /> Duration
            </span>
            <span className="text-sm font-medium mt-1">
              {transcript.duration ? `${transcript.duration} mins` : "Unknown"}
            </span>
          </div>
          
          <div className="flex flex-col p-3 border rounded-lg">
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <UserCircle className="h-3 w-3" /> Speaker
            </span>
            <span className="text-sm font-medium mt-1">
              {transcript.speakerName || "Unknown"}
            </span>
          </div>
          
          <div className="flex flex-col p-3 border rounded-lg">
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Star className="h-3 w-3" /> Call Score
            </span>
            <span className={`text-sm font-medium mt-1 ${
              transcript.callScore && transcript.callScore >= 80 ? "text-green-500" :
              transcript.callScore && transcript.callScore >= 60 ? "text-amber-500" :
              "text-red-500"
            }`}>
              {transcript.callScore || "N/A"}
            </span>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <Tabs defaultValue="transcript">
          <TabsList className="mb-4">
            <TabsTrigger value="transcript">Transcript</TabsTrigger>
            <TabsTrigger value="analysis">Analysis</TabsTrigger>
            <TabsTrigger value="metrics">Metrics</TabsTrigger>
          </TabsList>
          
          <TabsContent value="transcript">
            <div className="border rounded-lg p-4 mb-4">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-sm font-medium flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Call Transcript
                </h3>
                <Button variant="ghost" size="sm" onClick={() => setExpanded(!expanded)}>
                  {expanded ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
              </div>
              
              <div className={expanded ? "" : "max-h-[300px] overflow-y-auto"}>
                <p className="text-sm whitespace-pre-line">
                  {transcript.text}
                </p>
              </div>
            </div>
            
            <GlowingCard gradient="blue" className="mt-4 p-4">
              <div className="flex items-center gap-2 mb-3">
                {getSentimentIcon()}
                <h3 className="text-sm font-medium text-white">
                  Overall Sentiment: {transcript.sentiment?.charAt(0).toUpperCase() + transcript.sentiment?.slice(1) || "Unknown"}
                </h3>
              </div>
              
              <div className="flex flex-wrap gap-2 mt-3">
                <h4 className="text-xs font-medium text-white/70 flex items-center gap-1 w-full mb-1">
                  <Tag className="h-3 w-3" /> Key Topics:
                </h4>
                {transcript.keywords?.map((keyword, index) => (
                  <Badge key={index} variant="secondary" className="bg-white/10">
                    {keyword}
                  </Badge>
                ))}
              </div>
            </GlowingCard>
          </TabsContent>
          
          <TabsContent value="analysis">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Sentiment Analysis</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[200px] flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={getSentimentData()}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          <Cell key="positive" fill="#00C49F" />
                          <Cell key="negative" fill="#FF8042" />
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex justify-center gap-6 mt-4">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-[#00C49F]"></div>
                      <span className="text-sm">Positive</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-[#FF8042]"></div>
                      <span className="text-sm">Negative</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Speaker Activity</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[200px] flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={getSpeakerActivityData()}
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          dataKey="value"
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        >
                          <Cell key="rep" fill="#8884d8" />
                          <Cell key="customer" fill="#82ca9d" />
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="md:col-span-2">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Topic Timeline</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={getTopicTimelineData()}
                        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="Engagement" fill="#8884d8" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="metrics">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Speaking Rate (Words/Min)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={getSpeakingRateData()}
                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="rate" stroke="#8884d8" activeDot={{ r: 8 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Key Performance Areas</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm">Clarity</span>
                        <span className="text-sm font-medium">
                          {75 + Math.floor(Math.random() * 20)}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 dark:bg-gray-700">
                        <div
                          className="bg-blue-500 h-2 rounded-full"
                          style={{ width: `${75 + Math.floor(Math.random() * 20)}%` }}
                        ></div>
                      </div>
                    </div>
                    
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm">Discovery Questions</span>
                        <span className="text-sm font-medium">
                          {60 + Math.floor(Math.random() * 30)}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 dark:bg-gray-700">
                        <div
                          className="bg-purple-500 h-2 rounded-full"
                          style={{ width: `${60 + Math.floor(Math.random() * 30)}%` }}
                        ></div>
                      </div>
                    </div>
                    
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm">Solution Presentation</span>
                        <span className="text-sm font-medium">
                          {70 + Math.floor(Math.random() * 25)}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 dark:bg-gray-700">
                        <div
                          className="bg-green-500 h-2 rounded-full"
                          style={{ width: `${70 + Math.floor(Math.random() * 25)}%` }}
                        ></div>
                      </div>
                    </div>
                    
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm">Objection Handling</span>
                        <span className="text-sm font-medium">
                          {50 + Math.floor(Math.random() * 40)}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 dark:bg-gray-700">
                        <div
                          className="bg-yellow-500 h-2 rounded-full"
                          style={{ width: `${50 + Math.floor(Math.random() * 40)}%` }}
                        ></div>
                      </div>
                    </div>
                    
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm">Call to Action</span>
                        <span className="text-sm font-medium">
                          {60 + Math.floor(Math.random() * 35)}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 dark:bg-gray-700">
                        <div
                          className="bg-red-500 h-2 rounded-full"
                          style={{ width: `${60 + Math.floor(Math.random() * 35)}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default TranscriptDetail;
