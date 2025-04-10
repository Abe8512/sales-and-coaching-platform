import React, { useState, useEffect, useMemo, useCallback, useContext } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { ThemeContext } from "@/App";
import { useAnalyticsTranscripts } from '@/services/AnalyticsHubService';
import { Transcript } from '@/services/repositories/TranscriptsRepository';
import { SentimentTrendsChart } from '../CallAnalysis/SentimentTrendsChart';
import { ArrowUpRight, TrendingUp, Zap, BarChart3 } from 'lucide-react';
import ContentLoader from '../../components/ui/ContentLoader';
import KeywordTrendsChart from '../CallAnalysis/KeywordTrendsChart';
import { Skeleton } from '@/components/ui/skeleton';

interface CallAnalysisSectionProps {
  isLoading?: boolean;
}

interface DayValue {
  day: number;
  value: number;
}

// Extended CallTranscript interface to include potential analytics metrics
interface ExtendedCallTranscript extends Transcript {
  // These properties might not exist on the base CallTranscript
  engagementScore?: number;
  sentimentScore?: number;
  keywordScore?: number;
}

// Helper function for aggregating volume
const aggregateVolumeByDate = (transcripts: Transcript[] | null): { name: string; calls: number }[] => {
  if (!transcripts) return [];
  const volumeMap: { [key: string]: number } = {};
  transcripts.forEach(t => {
    const date = t.created_at.split('T')[0];
    volumeMap[date] = (volumeMap[date] || 0) + 1;
  });
  return Object.entries(volumeMap).map(([date, calls]) => ({ name: date, calls })).sort((a, b) => a.name.localeCompare(b.name));
};

// Implement CallVolumeChart directly here
const CallVolumeChart = ({ transcripts }: { transcripts: Transcript[] | null }) => {
  const data = aggregateVolumeByDate(transcripts);
  if (!data || data.length === 0) return <div className="h-[300px] w-full flex items-center justify-center bg-muted rounded"><p className="text-muted-foreground">Volume Data Unavailable</p></div>;
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" />
        <YAxis allowDecimals={false} />
        <Tooltip />
        <Bar dataKey="calls" fill="#8884d8" />
      </BarChart>
    </ResponsiveContainer>
  );
};

// Placeholder component for Keyword display
const KeywordDisplayComponent = ({ transcripts }: { transcripts: Transcript[] | null }) => {
   const getTopKeywords = (transcripts: Transcript[] | null): { keyword: string; count: number }[] => {
       if (!transcripts) return [];
       const keywordMap: { [key: string]: number } = {};
       transcripts.forEach(t => {
           (t.keywords ?? []).forEach(kw => {
               keywordMap[kw] = (keywordMap[kw] || 0) + 1;
           });
       });
       return Object.entries(keywordMap)
              .map(([keyword, count]) => ({ keyword, count }))
              .sort((a, b) => b.count - a.count)
              .slice(0, 10);
   };
   const topKeywords = getTopKeywords(transcripts);
   if (!topKeywords || topKeywords.length === 0) return <p className="text-sm text-muted-foreground">No keywords data available.</p>;
   return (
       <div className="flex flex-wrap gap-2">
           {topKeywords.map(kw => (
               <span key={kw.keyword} className="px-2 py-1 bg-muted text-muted-foreground rounded text-xs">
                   {kw.keyword} ({kw.count})
               </span>
           ))}
       </div>
   );
};

const CallAnalysisSection = () => {
  const { isDarkMode } = useContext(ThemeContext);
  const { transcripts, isLoading, error } = useAnalyticsTranscripts();

  if (error) {
    return (
      <Card>
        <CardHeader><CardTitle>Call Analysis</CardTitle></CardHeader>
        <CardContent><p className="text-red-500">Error loading analysis data: {error.message}</p></CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Call Analysis</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="volume">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="volume"><BarChart3 className="h-4 w-4 mr-1" />Call Volume</TabsTrigger>
            <TabsTrigger value="sentiment"><TrendingUp className="h-4 w-4 mr-1" />Sentiment Trend</TabsTrigger>
            <TabsTrigger value="keywords"><Zap className="h-4 w-4 mr-1" />Top Keywords</TabsTrigger>
          </TabsList>
          <TabsContent value="volume" className="mt-4">
            {isLoading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : (
              <CallVolumeChart transcripts={transcripts} />
            )}
          </TabsContent>
          <TabsContent value="sentiment" className="mt-4">
             {isLoading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : (
              <SentimentTrendsChart /> 
            )}
          </TabsContent>
          <TabsContent value="keywords" className="mt-4">
            {isLoading ? (
              <Skeleton className="h-[100px] w-full" />
            ) : (
               <KeywordDisplayComponent transcripts={transcripts} /> 
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default CallAnalysisSection;
