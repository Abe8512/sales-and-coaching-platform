
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from 'lucide-react';

interface KeywordTrend {
  id: string;
  keyword: string;
  category: 'positive' | 'neutral' | 'negative';
  count: number;
  last_used: string;
}

const KeywordTrendsChart = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [keywordTrends, setKeywordTrends] = useState<{
    positive: KeywordTrend[];
    neutral: KeywordTrend[];
    negative: KeywordTrend[];
  }>({
    positive: [],
    neutral: [],
    negative: []
  });
  
  useEffect(() => {
    const fetchKeywordTrends = async () => {
      setIsLoading(true);
      
      try {
        const { data, error } = await supabase
          .from('keyword_trends')
          .select('*')
          .order('count', { ascending: false });
          
        if (error) {
          console.error('Error fetching keyword trends:', error);
          return;
        }
        
        // Group keywords by category
        const categorized = {
          positive: data.filter(item => item.category === 'positive').slice(0, 10),
          neutral: data.filter(item => item.category === 'neutral').slice(0, 10),
          negative: data.filter(item => item.category === 'negative').slice(0, 10)
        };
        
        setKeywordTrends(categorized);
      } catch (error) {
        console.error('Error fetching keyword trends:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchKeywordTrends();
    
    // Refresh data every 30 seconds if user is on this page
    const interval = setInterval(fetchKeywordTrends, 30000);
    return () => clearInterval(interval);
  }, []);
  
  const renderChart = (data: KeywordTrend[], color: string) => {
    if (data.length === 0) {
      return (
        <div className="flex justify-center items-center h-64">
          <p className="text-muted-foreground">No data available</p>
        </div>
      );
    }
    
    return (
      <ResponsiveContainer width="100%" height={300}>
        <BarChart
          data={data}
          margin={{
            top: 20,
            right: 30,
            left: 20,
            bottom: 60,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="keyword" 
            angle={-45} 
            textAnchor="end"
            height={60}
          />
          <YAxis />
          <Tooltip />
          <Bar dataKey="count" fill={color} />
        </BarChart>
      </ResponsiveContainer>
    );
  };
  
  if (isLoading) {
    return (
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>Keyword Trends</CardTitle>
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
        <CardTitle>Keyword Trends</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="positive">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="positive">Positive</TabsTrigger>
            <TabsTrigger value="neutral">Neutral</TabsTrigger>
            <TabsTrigger value="negative">Negative</TabsTrigger>
          </TabsList>
          <TabsContent value="positive">
            {renderChart(keywordTrends.positive, '#22c55e')}
          </TabsContent>
          <TabsContent value="neutral">
            {renderChart(keywordTrends.neutral, '#64748b')}
          </TabsContent>
          <TabsContent value="negative">
            {renderChart(keywordTrends.negative, '#ef4444')}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default KeywordTrendsChart;
