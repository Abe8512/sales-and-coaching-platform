import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, LineChart, Line } from 'recharts';
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from 'lucide-react';
import { format, subDays } from 'date-fns';

interface SentimentData {
  date: string;
  positive: number;
  negative: number;
  neutral: number;
  total: number;
}

interface SentimentTrendsChartProps {
  condensed?: boolean;
}

export const SentimentTrendsChart = ({ condensed = false }: SentimentTrendsChartProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const [sentimentData, setSentimentData] = useState<SentimentData[]>([]);
  
  useEffect(() => {
    const fetchSentimentTrends = async () => {
      setIsLoading(true);
      
      try {
        // Fetch data from database table
        const { data: sentimentTrends, error } = await supabase
          .from('sentiment_trends')
          .select('*')
          .order('recorded_at', { ascending: false });
          
        if (error) {
          console.error('Error fetching sentiment trends:', error);
          return;
        }
        
        // If we have data, process it by day
        if (sentimentTrends && sentimentTrends.length > 0) {
          processSentimentData(sentimentTrends);
        } else {
          // Also check call_transcripts table for sentiment data
          const { data: transcripts, error: transcriptsError } = await supabase
            .from('call_transcripts')
            .select('created_at, sentiment');
            
          if (transcriptsError) {
            console.error('Error fetching transcripts for sentiment:', transcriptsError);
            return;
          }
          
          if (transcripts && transcripts.length > 0) {
            processSentimentFromTranscripts(transcripts);
          } else {
            // If no data from either source, use some placeholder data
            generatePlaceholderData();
          }
        }
      } catch (error) {
        console.error('Error in sentiment trends processing:', error);
        generatePlaceholderData();
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchSentimentTrends();
    
    // Refresh data every 60 seconds
    const interval = setInterval(fetchSentimentTrends, 60000);
    return () => clearInterval(interval);
  }, []);
  
  // Process sentiment data from sentiment_trends table
  const processSentimentData = (sentimentTrends: any[]) => {
    // Group by day
    const groupedByDay: Record<string, { positive: number; negative: number; neutral: number; total: number }> = {};
    
    // Get the last 7 days
    for (let i = 6; i >= 0; i--) {
      const date = format(subDays(new Date(), i), 'yyyy-MM-dd');
      groupedByDay[date] = { positive: 0, negative: 0, neutral: 0, total: 0 };
    }
    
    // Count sentiments by day
    sentimentTrends.forEach(item => {
      const date = format(new Date(item.recorded_at), 'yyyy-MM-dd');
      
      // Only process last 7 days
      if (groupedByDay[date]) {
        groupedByDay[date].total += 1;
        
        if (item.sentiment_label === 'positive') {
          groupedByDay[date].positive += 1;
        } else if (item.sentiment_label === 'negative') {
          groupedByDay[date].negative += 1;
        } else {
          groupedByDay[date].neutral += 1;
        }
      }
    });
    
    // Convert to array format for chart
    const chartData = Object.entries(groupedByDay).map(([date, counts]) => ({
      date: format(new Date(date), 'MMM d'),
      positive: counts.positive,
      negative: counts.negative,
      neutral: counts.neutral,
      total: counts.total
    }));
    
    setSentimentData(chartData);
  };
  
  // Process sentiment data from call_transcripts table
  const processSentimentFromTranscripts = (transcripts: any[]) => {
    // Group by day
    const groupedByDay: Record<string, { positive: number; negative: number; neutral: number; total: number }> = {};
    
    // Get the last 7 days
    for (let i = 6; i >= 0; i--) {
      const date = format(subDays(new Date(), i), 'yyyy-MM-dd');
      groupedByDay[date] = { positive: 0, negative: 0, neutral: 0, total: 0 };
    }
    
    // Count sentiments by day
    transcripts.forEach(item => {
      const date = format(new Date(item.created_at), 'yyyy-MM-dd');
      
      // Only process last 7 days
      if (groupedByDay[date]) {
        groupedByDay[date].total += 1;
        
        if (item.sentiment === 'positive') {
          groupedByDay[date].positive += 1;
        } else if (item.sentiment === 'negative') {
          groupedByDay[date].negative += 1;
        } else {
          groupedByDay[date].neutral += 1;
        }
      }
    });
    
    // Convert to array format for chart
    const chartData = Object.entries(groupedByDay).map(([date, counts]) => ({
      date: format(new Date(date), 'MMM d'),
      positive: counts.positive,
      negative: counts.negative,
      neutral: counts.neutral,
      total: counts.total
    }));
    
    setSentimentData(chartData);
  };
  
  // Generate placeholder data if no real data is available
  const generatePlaceholderData = () => {
    const data: SentimentData[] = [];
    
    for (let i = 6; i >= 0; i--) {
      const date = format(subDays(new Date(), i), 'MMM d');
      data.push({
        date,
        positive: 0,
        negative: 0,
        neutral: 0,
        total: 0
      });
    }
    
    setSentimentData(data);
  };
  
  if (isLoading) {
    return (
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>Sentiment Trends</CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className="shadow-md">
      <CardHeader>
        <CardTitle>Sentiment Trends</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart
            data={sentimentData}
            margin={{
              top: 20,
              right: 30,
              left: 20,
              bottom: 20,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="positive" name="Positive" stackId="a" fill="#10B981" />
            <Bar dataKey="neutral" name="Neutral" stackId="a" fill="#3B82F6" />
            <Bar dataKey="negative" name="Negative" stackId="a" fill="#EF4444" />
            <Line type="monotone" dataKey="total" name="Total Calls" stroke="#9333EA" strokeWidth={2} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
