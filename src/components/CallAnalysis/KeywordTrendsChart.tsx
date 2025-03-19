
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Database } from '@/integrations/supabase/types';

type KeywordCategory = 'positive' | 'neutral' | 'negative';

interface KeywordTrend {
  id: string;
  keyword: string;
  category: KeywordCategory;
  count: number;
  last_used: string;
}

interface GroupedKeywords {
  positive: KeywordTrend[];
  neutral: KeywordTrend[];
  negative: KeywordTrend[];
}

const KeywordTrendsChart = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [keywordTrends, setKeywordTrends] = useState<GroupedKeywords>({
    positive: [],
    neutral: [],
    negative: []
  });
  const [activeCategory, setActiveCategory] = useState<KeywordCategory>('positive');
  
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
        
        // Group keywords by category and ensure correct types
        const grouped: GroupedKeywords = {
          positive: [],
          neutral: [],
          negative: []
        };
        
        data.forEach(item => {
          // Ensure we're working with validated data
          if (item && typeof item === 'object' && 'category' in item) {
            const category = item.category as KeywordCategory;
            if (category === 'positive' || category === 'neutral' || category === 'negative') {
              grouped[category].push({
                id: item.id,
                keyword: item.keyword,
                category,
                count: item.count || 1,
                last_used: item.last_used || new Date().toISOString()
              });
            }
          }
        });
        
        setKeywordTrends(grouped);
      } catch (error) {
        console.error('Error fetching keyword trends:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchKeywordTrends();
    
    // Refresh data every 30 seconds
    const interval = setInterval(fetchKeywordTrends, 30000);
    return () => clearInterval(interval);
  }, []);
  
  // Save a keyword to the database - Fixed type error in this function
  const saveKeyword = async (keyword: string, category: KeywordCategory) => {
    try {
      const insertData: Database['public']['Tables']['keyword_trends']['Insert'] = {
        keyword,
        category,
        count: 1,
        last_used: new Date().toISOString()
      };
      
      // Fixed: Using proper format for onConflict parameter as a string, not an array
      const { error } = await supabase
        .from('keyword_trends')
        .upsert(insertData, { onConflict: 'keyword,category' });
        
      if (error) {
        console.error('Error saving keyword trend:', error);
      }
    } catch (error) {
      console.error('Error saving keyword trend:', error);
    }
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
  
  // Prepare data for the chart
  const currentKeywords = keywordTrends[activeCategory] || [];
  
  // Sort by count (highest first) and limit to top 10
  const chartData = [...currentKeywords]
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
  
  // If no data yet, show a message
  if (chartData.length === 0) {
    return (
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>Keyword Trends</CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center items-center h-64">
          <p className="text-muted-foreground">No keyword data available yet. Complete a call to see trends.</p>
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
        <Tabs 
          defaultValue="positive" 
          value={activeCategory}
          onValueChange={(value) => setActiveCategory(value as KeywordCategory)}
          className="mb-4"
        >
          <TabsList>
            <TabsTrigger value="positive">Positive</TabsTrigger>
            <TabsTrigger value="neutral">Neutral</TabsTrigger>
            <TabsTrigger value="negative">Negative</TabsTrigger>
          </TabsList>
        </Tabs>
        
        <ResponsiveContainer width="100%" height={300}>
          <BarChart
            data={chartData}
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
              height={80}
            />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar 
              dataKey="count" 
              name="Frequency" 
              fill={
                activeCategory === 'positive' ? '#10B981' : 
                activeCategory === 'negative' ? '#EF4444' : '#3B82F6'
              }
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export default KeywordTrendsChart;
