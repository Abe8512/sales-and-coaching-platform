
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from 'lucide-react';
import { format } from 'date-fns';

interface SentimentTrend {
  id: string;
  sentiment_label: 'positive' | 'neutral' | 'negative';
  confidence: number;
  recorded_at: string;
  recorded_at_formatted?: string;
}

const SentimentTrendsChart = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [sentimentTrends, setSentimentTrends] = useState<SentimentTrend[]>([]);
  
  useEffect(() => {
    const fetchSentimentTrends = async () => {
      setIsLoading(true);
      
      try {
        const { data, error } = await supabase
          .from('sentiment_trends')
          .select('*')
          .order('recorded_at', { ascending: true })
          .limit(100);
          
        if (error) {
          console.error('Error fetching sentiment trends:', error);
          return;
        }
        
        // Format data for chart and ensure correct types
        const formattedData: SentimentTrend[] = data.map(item => ({
          ...item,
          sentiment_label: (item.sentiment_label as 'positive' | 'neutral' | 'negative'),
          recorded_at_formatted: format(new Date(item.recorded_at || new Date()), 'MM/dd HH:mm')
        }));
        
        setSentimentTrends(formattedData);
      } catch (error) {
        console.error('Error fetching sentiment trends:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchSentimentTrends();
    
    // Refresh data every 30 seconds
    const interval = setInterval(fetchSentimentTrends, 30000);
    return () => clearInterval(interval);
  }, []);
  
  // Save the current sentiment to the database when a call ends
  const saveSentimentTrend = async (label: 'positive' | 'neutral' | 'negative', confidence: number) => {
    try {
      const { error } = await supabase
        .from('sentiment_trends')
        .insert([{
          sentiment_label: label,
          confidence
        }]);
        
      if (error) {
        console.error('Error saving sentiment trend:', error);
      }
    } catch (error) {
      console.error('Error saving sentiment trend:', error);
    }
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
  
  // If no data yet, show a message
  if (sentimentTrends.length === 0) {
    return (
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>Sentiment Trends</CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center items-center h-64">
          <p className="text-muted-foreground">No sentiment data available yet. Complete a call to see trends.</p>
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
          <LineChart
            data={sentimentTrends}
            margin={{
              top: 20,
              right: 30,
              left: 20,
              bottom: 60,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="recorded_at_formatted" 
              angle={-45} 
              textAnchor="end"
              height={60}
            />
            <YAxis domain={[0, 1]} />
            <Tooltip />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="confidence" 
              stroke="#8884d8" 
              name="Sentiment Score"
              dot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export { SentimentTrendsChart, type SentimentTrend };
