
import { useState, useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";
import type { Database } from '@/integrations/supabase/types';

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

export function useKeywordTrends() {
  const [isLoading, setIsLoading] = useState(true);
  const [keywordTrends, setKeywordTrends] = useState<GroupedKeywords>({
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
        
        // Group keywords by category and ensure correct types
        const grouped: GroupedKeywords = {
          positive: [],
          neutral: [],
          negative: []
        };
        
        if (data) {
          data.forEach(item => {
            // Ensure we're working with validated data
            if (item && typeof item === 'object') {
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
        }
        
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
  
  // Function to save a keyword to the database
  const saveKeyword = async (keyword: string, category: KeywordCategory) => {
    try {
      const insertData = {
        keyword,
        category,
        count: 1,
        last_used: new Date().toISOString()
      };
      
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

  return {
    isLoading,
    keywordTrends,
    saveKeyword
  };
}
