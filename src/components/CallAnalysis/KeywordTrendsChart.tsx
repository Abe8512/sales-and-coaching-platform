
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from 'lucide-react';
import { useKeywordTrends, KeywordCategory } from '@/hooks/useKeywordTrends';
import KeywordChart from './KeywordChart';
import KeywordCategoryTabs from './KeywordCategoryTabs';

const KeywordTrendsChart = () => {
  const { isLoading, keywordTrends } = useKeywordTrends();
  const [activeCategory, setActiveCategory] = useState<KeywordCategory>('positive');
  
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
  
  // Get the current keywords based on active category
  const currentKeywords = keywordTrends[activeCategory] || [];
  
  return (
    <Card className="shadow-md">
      <CardHeader>
        <CardTitle>Keyword Trends</CardTitle>
      </CardHeader>
      <CardContent>
        <KeywordCategoryTabs 
          activeCategory={activeCategory}
          onCategoryChange={setActiveCategory}
        />
        
        <KeywordChart 
          keywords={currentKeywords}
          category={activeCategory}
        />
      </CardContent>
    </Card>
  );
};

export default KeywordTrendsChart;
