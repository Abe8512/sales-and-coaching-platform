import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useCallMetricsStore } from '@/store/useCallMetricsStore';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, ThumbsUp, ThumbsDown, Minus } from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";
import { useSharedKeywordData } from "@/services/SharedDataService";
import { useSharedFilters } from "@/contexts/SharedFilterContext";
import type { Database } from '@/integrations/supabase/types';
import { errorHandler } from '@/services/ErrorHandlingService';

type KeywordCategory = 'positive' | 'neutral' | 'negative';

interface KeywordInsightsProps {
  condensed?: boolean;
}

const KeywordInsights = ({ condensed = false }: KeywordInsightsProps) => {
  const { keywordsByCategory: liveKeywordsByCategory, classifyKeywords, isRecording } = useCallMetricsStore();
  const [isUpdating, setIsUpdating] = useState(false);
  const { filters } = useSharedFilters();
  const { keywords: sharedKeywords, keywordsByCategory: sharedKeywordsByCategory, isLoading: keywordDataLoading } = useSharedKeywordData(filters);
  
  // Use a ref to track processed keywords to avoid duplicates
  const processedKeywordsRef = React.useRef(new Set<string>());
  
  // Default empty arrays for categories to avoid undefined errors
  const defaultCategories = {
    positive: [] as string[],
    neutral: [] as string[],
    negative: [] as string[]
  };
  
  // Ensure keywordsByCategory has default values
  const safeLiveKeywordsByCategory = liveKeywordsByCategory || defaultCategories;
  
  // Ensure sharedKeywordsByCategory is properly structured with useMemo to prevent unnecessary recalculations
  const safeSharedKeywordsByCategory = useMemo(() => ({
    positive: Array.isArray(sharedKeywordsByCategory?.positive) ? sharedKeywordsByCategory.positive : [],
    neutral: Array.isArray(sharedKeywordsByCategory?.neutral) ? sharedKeywordsByCategory.neutral : [],
    negative: Array.isArray(sharedKeywordsByCategory?.negative) ? sharedKeywordsByCategory.negative : []
  }), [sharedKeywordsByCategory]);
  
  // Merge live and historical keywords with useMemo to prevent unnecessary recalculations
  const mergedKeywords = useMemo(() => ({
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
  }), [safeLiveKeywordsByCategory, safeSharedKeywordsByCategory]);
  
  // Process a single keyword with proper transaction handling
  const processKeyword = useCallback(async (keyword: string, category: KeywordCategory): Promise<boolean> => {
    if (processedKeywordsRef.current.has(`${keyword}-${category}`)) {
      return true; // Skip already processed keywords
    }
    
    try {
      // First check if keyword exists
      const { data, error: selectError } = await supabase
        .from('keyword_trends')
        .select('*')
        .eq('keyword', keyword)
        .eq('category', category)
        .maybeSingle();
      
      if (selectError) {
        throw new Error(`Error checking existing keyword: ${selectError.message}`);
      }
      
      if (data) {
        // Update existing keyword
        const updateData: Database['public']['Tables']['keyword_trends']['Update'] = {
          count: (data.count || 1) + 1,
          last_used: new Date().toISOString()
        };
        
        const { error: updateError } = await supabase
          .from('keyword_trends')
          .update(updateData)
          .eq('id', data.id);
        
        if (updateError) {
          throw new Error(`Error updating keyword: ${updateError.message}`);
        }
      } else {
        // Insert new keyword
        const insertData: Database['public']['Tables']['keyword_trends']['Insert'] = {
          keyword,
          category,
          count: 1,
          last_used: new Date().toISOString()
        };
        
        const { error: insertError } = await supabase
          .from('keyword_trends')
          .insert(insertData);
        
        if (insertError) {
          throw new Error(`Error inserting keyword: ${insertError.message}`);
        }
      }
      
      // Mark as processed to avoid duplicates
      processedKeywordsRef.current.add(`${keyword}-${category}`);
      return true;
    } catch (error) {
      console.error(`Error processing keyword "${keyword}":`, error);
      return false;
    }
  }, []);
  
  // Improved function to save keywords with optimizations and error handling
  const saveKeywordsTrends = useCallback(async () => {
    if (!isRecording || isUpdating || !liveKeywordsByCategory) return;
    
    setIsUpdating(true);
    
    try {
      const promises: Promise<boolean>[] = [];
      let processedCount = 0;
      let errorCount = 0;
      
      // Process each category
      for (const [category, keywords] of Object.entries(safeLiveKeywordsByCategory)) {
        // Skip if no keywords
        if (!keywords || !keywords.length) continue;
        
        // Ensure category is a valid KeywordCategory
        const typedCategory = category as KeywordCategory;
        
        // Process each keyword, but limit concurrent operations
        for (const keyword of keywords) {
          // Add each keyword processing to promises array
          promises.push(
            processKeyword(keyword as string, typedCategory)
              .then(success => {
                if (success) processedCount++;
                else errorCount++;
                return success;
              })
          );
          
          // Process in batches of 5 to prevent overwhelming the database
          if (promises.length >= 5) {
            await Promise.all(promises);
            promises.length = 0; // Clear processed promises
          }
        }
      }
      
      // Process any remaining promises
      if (promises.length > 0) {
        await Promise.all(promises);
      }
      
      console.log(`Keywords saved: ${processedCount} successful, ${errorCount} failed`);
    } catch (error) {
      console.error('Error saving keyword trends:', error);
      errorHandler.handle('Failed to save keyword trends');
    } finally {
      setIsUpdating(false);
    }
  }, [isRecording, isUpdating, liveKeywordsByCategory, safeLiveKeywordsByCategory, processKeyword]);
  
  // Initial classification effect
  useEffect(() => {
    // Initial classification if available
    if (classifyKeywords) {
      classifyKeywords();
    }
  }, [classifyKeywords]);

  // Reclassification and saving effect
  useEffect(() => {
    // Reclassify when recording is active
    if (isRecording && classifyKeywords) {
      const interval = setInterval(() => {
        classifyKeywords();
        saveKeywordsTrends();
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [isRecording, classifyKeywords, saveKeywordsTrends]);
  
  // Reset processed keywords when recording state changes
  useEffect(() => {
    if (!isRecording) {
      processedKeywordsRef.current.clear();
    }
  }, [isRecording]);
  
  // Skip rendering if no keywords from any source and not loading
  const hasKeywords = mergedKeywords.positive.length > 0 || 
                     mergedKeywords.neutral.length > 0 || 
                     mergedKeywords.negative.length > 0 ||
                     isRecording || 
                     keywordDataLoading;
                     
  if (!hasKeywords) {
    return null;
  }
  
  return (
    <Card className="shadow-md">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-blue-500" />
          Keyword Insights
          {isUpdating && <span className="text-xs text-muted-foreground ml-2">(Updating...)</span>}
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

export default React.memo(KeywordInsights);
