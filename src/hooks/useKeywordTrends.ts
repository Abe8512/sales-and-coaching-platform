import { useState, useEffect } from 'react';
import { useKeywordTrends as useSharedKeywordTrends } from '@/services/SharedDataService';
import { useSharedFilters } from '@/contexts/SharedFilterContext';

export type KeywordCategory = 'positive' | 'neutral' | 'negative';

export interface KeywordTrend {
  id: string;
  keyword: string;
  category: KeywordCategory;
  count: number;
  last_used: string;
}

export interface GroupedKeywords {
  positive: KeywordTrend[];
  neutral: KeywordTrend[];
  negative: KeywordTrend[];
}

/**
 * @deprecated Use the useKeywordTrends from SharedDataService instead
 * This hook is kept for backward compatibility
 */
export function useKeywordTrends() {
  const { filters } = useSharedFilters();
  const { keywordData, isLoading, error } = useSharedKeywordTrends(filters);
  const [keywordTrends, setKeywordTrends] = useState<GroupedKeywords>({
    positive: [],
    neutral: [],
    negative: []
  });
  
  // Convert the data from central service to this hook's format
  useEffect(() => {
    if (!keywordData || keywordData.length === 0) {
      return;
    }
    
    const grouped: GroupedKeywords = {
      positive: [],
      neutral: [],
      negative: []
    };
    
    keywordData.forEach(item => {
      const category = item.category as KeywordCategory;
      if (category === 'positive' || category === 'neutral' || category === 'negative') {
        grouped[category].push({
          id: String(item.keyword),
          keyword: item.keyword,
          category,
          count: item.count,
          last_used: new Date().toISOString()
        });
      }
    });
    
    setKeywordTrends(grouped);
  }, [keywordData]);
  
  // Function to save a keyword, delegates to the central service
  const saveKeyword = async (keyword: string, category: KeywordCategory) => {
    console.log('saveKeyword called from legacy hook, this should use the central service');
    // This would ideally call into the central service
  };
  
  return {
    isLoading,
    keywordTrends,
    saveKeyword
  };
}
