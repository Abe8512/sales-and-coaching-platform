import React, { useEffect, useState } from 'react';
import { useCallMetricsStore } from '@/store/useCallMetricsStore';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, ThumbsUp, ThumbsDown, Minus } from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";
import { useSharedKeywordData } from "@/services/SharedDataService";
import { useSharedFilters } from "@/contexts/SharedFilterContext";
import type { Database } from '@/integrations/supabase/types';

type KeywordCategory = 'positive' | 'neutral' | 'negative';

const KeywordInsights = () => {
  const { keywordsByCategory: liveKeywordsByCategory, classifyKeywords, isRecording } = useCallMetricsStore();
  const [isUpdating, setIsUpdating] = useState(false);
  const { filters } = useSharedFilters();
  const { keywords: sharedKeywords, keywordsByCategory: sharedKeywordsByCategory } = useSharedKeywordData(filters);
  
  // Default empty arrays for categories to avoid undefined errors
  const defaultCategories = {
    positive: [] as string[],
    neutral: [] as string[],
    negative: [] as string[]
  };
  
  // Ensure keywordsByCategory has default values
  const safeLiveKeywordsByCategory = liveKeywordsByCategory || defaultCategories;
  
  // Ensure sharedKeywordsByCategory is properly structured
  const safeSharedKeywordsByCategory = {
    positive: Array.isArray(sharedKeywordsByCategory?.positive) ? sharedKeywordsByCategory.positive : [],
    neutral: Array.isArray(sharedKeywordsByCategory?.neutral) ? sharedKeywordsByCategory.neutral : [],
    negative: Array.isArray(sharedKeywordsByCategory?.negative) ? sharedKeywordsByCategory.negative : []
  };
  
  // Merge live and historical keywords
  const mergedKeywords = {
    positive: [...new Set([
      ...safeLiveKeywordsByCategory.positive || [], 
      ...safeSharedKeywordsByCategory.positive
    ])],
    neutral: [...new Set([
      ...safeLiveKeywordsByCategory.neutral || [], 
      ...safeSharedKeywordsByCategory.neutral
    ])],
    negative: [...new Set([
      ...safeLiveKeywordsByCategory.negative || [], 
      ...safeSharedKeywordsByCategory.negative
    ])]
  };
  
  // Save keywords to Supabase for cross-component consistency
  const saveKeywordsTrends = async () => {
    if (!isRecording || isUpdating || !liveKeywordsByCategory) return;
    
    setIsUpdating(true);
    
    try {
      // Process each category
      for (const [category, keywords] of Object.entries(safeLiveKeywordsByCategory)) {
        // Skip if no keywords
        if (!keywords || !keywords.length) continue;
        
        // Ensure category is a valid KeywordCategory
        const typedCategory = category as KeywordCategory;
        
        // Process each keyword
        for (const keyword of keywords) {
          // First check if keyword exists
          const { data } = await supabase
            .from('keyword_trends')
            .select('*')
            .eq('keyword', keyword as string)
            .eq('category', typedCategory)
            .maybeSingle();
            
          if (data) {
            // Update existing keyword
            const updateData: Database['public']['Tables']['keyword_trends']['Update'] = {
              count: (data.count || 1) + 1,
              last_used: new Date().toISOString()
            };
            
            await supabase
              .from('keyword_trends')
              .update(updateData)
              .eq('id', data.id);
          } else {
            // Insert new keyword
            const insertData: Database['public']['Tables']['keyword_trends']['Insert'] = {
              keyword: keyword as string,
              category: typedCategory,
              count: 1,
              last_used: new Date().toISOString()
            };
            
            await supabase
              .from('keyword_trends')
              .insert(insertData);
          }
        }
      }
      
      // Log for data validation
      if (process.env.NODE_ENV !== 'production') {
        console.log('Keywords saved to database for cross-component consistency');
      }
    } catch (error) {
      console.error('Error saving keyword trends:', error);
    } finally {
      setIsUpdating(false);
    }
  };
  
  useEffect(() => {
    // Initial classification if available
    if (classifyKeywords) {
      classifyKeywords();
    }
    
    // Reclassify when recording is active
    if (isRecording && classifyKeywords) {
      const interval = setInterval(() => {
        classifyKeywords();
        saveKeywordsTrends();
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [classifyKeywords, isRecording]);
  
  // Skip rendering if no keywords from any source
  const hasKeywords = mergedKeywords.positive.length > 0 || 
                     mergedKeywords.neutral.length > 0 || 
                     mergedKeywords.negative.length > 0 ||
                     isRecording;
                     
  if (!hasKeywords) {
    return null;
  }
  
  return (
    <Card className="shadow-md">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-blue-500" />
          Keyword Insights
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <ThumbsUp className="h-4 w-4 text-green-500" />
              <h3 className="font-medium text-green-500">Positive Keywords</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {mergedKeywords.positive.length > 0 ? (
                mergedKeywords.positive.map((keyword, index) => (
                  <Badge key={index} variant="outline" className="bg-green-50 text-green-600 border-green-200">
                    {keyword}
                  </Badge>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No positive keywords detected</p>
              )}
            </div>
          </div>
          
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Minus className="h-4 w-4 text-gray-500" />
              <h3 className="font-medium text-gray-500">Neutral Keywords</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {mergedKeywords.neutral.length > 0 ? (
                mergedKeywords.neutral.map((keyword, index) => (
                  <Badge key={index} variant="outline" className="bg-gray-50 text-gray-600 border-gray-200">
                    {keyword}
                  </Badge>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No neutral keywords detected</p>
              )}
            </div>
          </div>
          
          <div>
            <div className="flex items-center gap-2 mb-2">
              <ThumbsDown className="h-4 w-4 text-red-500" />
              <h3 className="font-medium text-red-500">Negative Keywords</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {mergedKeywords.negative.length > 0 ? (
                mergedKeywords.negative.map((keyword, index) => (
                  <Badge key={index} variant="outline" className="bg-red-50 text-red-600 border-red-200">
                    {keyword}
                  </Badge>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No negative keywords detected</p>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default KeywordInsights;
