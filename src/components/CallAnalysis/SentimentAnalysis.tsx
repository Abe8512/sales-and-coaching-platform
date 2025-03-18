
import React, { useContext, useEffect, useState } from "react";
import { LineChart, Line, ResponsiveContainer, ReferenceLine, CartesianGrid, XAxis, YAxis, Legend, Tooltip } from "recharts";
import { Info } from "lucide-react";
import GlowingCard from "../ui/GlowingCard";
import ExpandableChart from "../ui/ExpandableChart";
import { useChartData } from "@/hooks/useChartData";
import { Button } from "../ui/button";
import { ChartContainer, ChartTooltipContent } from "../ui/chart";
import { getStoredTranscriptions, StoredTranscription } from "@/services/WhisperService";

// Function to analyze sentiment patterns from a transcript
const analyzeTranscriptSentiment = (transcript: StoredTranscription | null) => {
  if (!transcript || !transcript.text) {
    return null;
  }
  
  const text = transcript.text;
  const duration = transcript.duration || 480; // Default to 8 minutes if no duration
  
  // Generate sentiment data points based on the transcript text
  const dataPoints = 16; // Number of data points to generate
  const segmentLength = Math.floor(text.length / dataPoints);
  
  const positiveWords = ['great', 'good', 'excellent', 'happy', 'pleased', 'thank', 'appreciate', 'yes', 'perfect', 'love'];
  const negativeWords = ['bad', 'terrible', 'unhappy', 'disappointed', 'issue', 'problem', 'no', 'not', 'cannot', 'wrong'];
  
  const sentimentData = [];
  
  // For each segment, calculate a sentiment score
  for (let i = 0; i < dataPoints; i++) {
    const startIdx = i * segmentLength;
    const endIdx = Math.min((i + 1) * segmentLength, text.length);
    const segment = text.substring(startIdx, endIdx).toLowerCase();
    
    let positiveScore = 0;
    let negativeScore = 0;
    
    // Calculate positive sentiment
    positiveWords.forEach(word => {
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      const matches = segment.match(regex);
      if (matches) positiveScore += matches.length;
    });
    
    // Calculate negative sentiment
    negativeWords.forEach(word => {
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      const matches = segment.match(regex);
      if (matches) negativeScore += matches.length;
    });
    
    // Normalize to [-1, 1] range
    const netScore = (positiveScore - negativeScore) / Math.max(1, positiveScore + negativeScore);
    
    // Calculate time based on segment position and duration
    const minutes = Math.floor((i * duration) / dataPoints / 60);
    const seconds = Math.floor((i * duration) / dataPoints % 60);
    const time = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    
    // For simplicity, generate agent and customer sentiment that generally correlate
    // In a real implementation, this would be based on speaker diarization
    sentimentData.push({
      time,
      agent: Math.min(0.8, Math.max(-0.8, netScore * 0.8 + 0.2)), // Bias agent sentiment slightly positive
      customer: Math.min(0.8, Math.max(-0.8, netScore * 0.7 - 0.1)), // Bias customer sentiment slightly negative
    });
  }
  
  return sentimentData;
};

// Function to identify key sentiment moments in a transcript
const findSentimentKeyMoments = (transcript: StoredTranscription | null, sentimentData: any[]) => {
  if (!transcript || !sentimentData || sentimentData.length === 0) {
    return [];
  }
  
  const keyMoments = [];
  
  // Find the largest drop in customer sentiment
  let largestDrop = 0;
  let dropIndex = -1;
  
  for (let i = 1; i < sentimentData.length; i++) {
    const drop = sentimentData[i-1].customer - sentimentData[i].customer;
    if (drop > largestDrop) {
      largestDrop = drop;
      dropIndex = i;
    }
  }
  
  if (dropIndex > 0 && largestDrop > 0.2) {
    keyMoments.push({
      time: sentimentData[dropIndex].time,
      description: "Customer sentiment dropped significantly, possibly due to objection or concern",
      type: "negative"
    });
  }
  
  // Find the largest increase in customer sentiment
  let largestIncrease = 0;
  let increaseIndex = -1;
  
  for (let i = 1; i < sentimentData.length; i++) {
    const increase = sentimentData[i].customer - sentimentData[i-1].customer;
    if (increase > largestIncrease) {
      largestIncrease = increase;
      increaseIndex = i;
    }
  }
  
  if (increaseIndex > 0 && largestIncrease > 0.2) {
    keyMoments.push({
      time: sentimentData[increaseIndex].time,
      description: "Customer sentiment improved significantly, likely due to value proposition or solution",
      type: "positive"
    });
  }
  
  // Check end of call sentiment
  const endSentiment = sentimentData[sentimentData.length - 1].customer;
  if (endSentiment > 0.3) {
    keyMoments.push({
      time: sentimentData[sentimentData.length - 1].time,
      description: "Call ended on a positive note with good customer sentiment",
      type: "positive"
    });
  } else if (endSentiment < -0.3) {
    keyMoments.push({
      time: sentimentData[sentimentData.length - 1].time,
      description: "Call ended with negative customer sentiment, follow-up may be needed",
      type: "negative"
    });
  }
  
  return keyMoments;
};

const SentimentAnalysis = () => {
  const { isDarkMode } = useContext(ThemeContext);
  const [latestTranscript, setLatestTranscript] = useState<StoredTranscription | null>(null);
  const [initialSentimentData, setInitialSentimentData] = useState<any[]>([]);
  const [sentimentKeyMoments, setSentimentKeyMoments] = useState<any[]>([]);
  
  useEffect(() => {
    // Get the latest transcript
    const transcriptions = getStoredTranscriptions();
    if (transcriptions.length > 0) {
      const latest = [...transcriptions].sort((a, b) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      )[0];
      
      setLatestTranscript(latest);
      
      // Generate sentiment data from the transcript
      const sentimentData = analyzeTranscriptSentiment(latest);
      if (sentimentData) {
        setInitialSentimentData(sentimentData);
        
        // Find key moments in the sentiment data
        const keyMoments = findSentimentKeyMoments(latest, sentimentData);
        setSentimentKeyMoments(keyMoments);
      }
    }
  }, []);

  const {
    data: sentimentData,
    isLoading,
    refresh,
    lastUpdated,
    simulateDataUpdate
  } = useChartData(initialSentimentData);

  // Expanded chart content
  const expandedSentimentChart = (
    <div className="space-y-4">
      <div className="flex justify-between">
        <div>
          <h3 className="text-lg font-bold">Detailed Sentiment Analysis</h3>
          <p className="text-sm text-muted-foreground">Track sentiment changes throughout the call</p>
        </div>
        <Button onClick={simulateDataUpdate}>Simulate Update</Button>
      </div>
      
      <div className="h-[400px]">
        <ChartContainer
          config={{
            agent: {
              label: "Agent",
              theme: {
                light: "#00F0FF",
                dark: "#00F0FF",
              },
            },
            customer: {
              label: "Customer",
              theme: {
                light: "#FF4DCD",
                dark: "#FF4DCD",
              },
            },
          }}
        >
          <LineChart 
            data={sentimentData} 
            margin={{ top: 20, right: 30, left: 20, bottom: 30 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="time" />
            <YAxis domain={[-1, 1]} />
            <Tooltip content={<ChartTooltipContent />} />
            <Legend />
            <ReferenceLine y={0} stroke="rgba(255,255,255,0.2)" />
            <Line
              type="monotone"
              dataKey="agent"
              stroke="var(--color-agent)"
              strokeWidth={2}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
              name="Agent"
            />
            <Line
              type="monotone"
              dataKey="customer"
              stroke="var(--color-customer)"
              strokeWidth={2}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
              name="Customer"
            />
          </LineChart>
        </ChartContainer>
      </div>
      
      <div className="space-y-2">
        <h4 className="font-medium">Sentiment Key Points</h4>
        {sentimentKeyMoments.length > 0 ? (
          sentimentKeyMoments.map((moment, index) => (
            <div 
              key={index} 
              className={`p-4 rounded-lg text-sm flex gap-3 ${
                moment.type === "positive" 
                  ? "bg-neon-green/10 border border-neon-green/30" 
                  : "bg-neon-red/10 border border-neon-red/30"
              }`}
            >
              <span className={`font-medium w-12 ${
                moment.type === "positive" ? "text-neon-green" : "text-neon-red"
              }`}>
                {moment.time}
              </span>
              <span className="text-foreground">{moment.description}</span>
            </div>
          ))
        ) : (
          <div className="p-4 rounded-lg text-sm border">
            No key points identified in this call
          </div>
        )}
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 border rounded-lg">
          <div className="text-sm text-muted-foreground">Average Agent Sentiment</div>
          <div className="text-2xl font-bold">
            {sentimentData.length > 0 ? 
              (sentimentData.reduce((acc, item) => acc + item.agent, 0) / sentimentData.length).toFixed(2) : 
              "N/A"
            }
          </div>
        </div>
        <div className="p-4 border rounded-lg">
          <div className="text-sm text-muted-foreground">Average Customer Sentiment</div>
          <div className="text-2xl font-bold">
            {sentimentData.length > 0 ?
              (sentimentData.reduce((acc, item) => acc + item.customer, 0) / sentimentData.length).toFixed(2) :
              "N/A"
            }
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <GlowingCard gradient="blue" className="h-full">
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-xl font-bold text-white">Sentiment Analysis</h2>
        <button className="text-gray-400 hover:text-white">
          <Info className="h-5 w-5" />
        </button>
      </div>
      
      {sentimentData.length > 0 ? (
        <>
          <ExpandableChart 
            title="Call Sentiment" 
            subtitle="Agent and customer sentiment throughout the call"
            expandedContent={expandedSentimentChart}
            isLoading={isLoading}
            onRefresh={simulateDataUpdate}
            lastUpdated={lastUpdated}
            className="mb-4"
          >
            <div className="h-60">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={sentimentData}>
                  <ReferenceLine y={0} stroke="rgba(255,255,255,0.1)" />
                  <Line
                    type="monotone"
                    dataKey="agent"
                    stroke="#00F0FF"
                    strokeWidth={2}
                    dot={false}
                    name="Agent"
                  />
                  <Line
                    type="monotone"
                    dataKey="customer"
                    stroke="#FF4DCD"
                    strokeWidth={2}
                    dot={false}
                    name="Customer"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </ExpandableChart>
          
          <div className="flex justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-neon-blue"></div>
              <span className="text-sm text-gray-400">Agent</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-neon-pink"></div>
              <span className="text-sm text-gray-400">Customer</span>
            </div>
          </div>
          
          <h3 className="text-sm font-medium text-white mb-2">Key Moments</h3>
          <div className="space-y-2">
            {sentimentKeyMoments.length > 0 ? (
              sentimentKeyMoments.map((moment, index) => (
                <div 
                  key={index} 
                  className={`p-2 rounded-lg text-sm flex gap-2 ${
                    moment.type === "positive" 
                      ? "bg-neon-green/10 border border-neon-green/30" 
                      : "bg-neon-red/10 border border-neon-red/30"
                  }`}
                >
                  <span className={`font-medium ${
                    moment.type === "positive" ? "text-neon-green" : "text-neon-red"
                  }`}>
                    {moment.time}
                  </span>
                  <span className="text-white">{moment.description}</span>
                </div>
              ))
            ) : (
              <div className="p-2 rounded-lg text-sm border border-white/10 text-white">
                No key moments identified
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <p className="text-muted-foreground mb-2">No sentiment data available</p>
          <p className="text-sm text-muted-foreground">
            Upload or record a call to see sentiment analysis
          </p>
        </div>
      )}
    </GlowingCard>
  );
};

export default SentimentAnalysis;
