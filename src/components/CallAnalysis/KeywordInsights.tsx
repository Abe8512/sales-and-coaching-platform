
import React, { useEffect, useState } from 'react';
import { useCallMetricsStore } from '@/store/useCallMetricsStore';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, ThumbsUp, ThumbsDown, Minus } from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";
import { useSharedKeywordData } from "@/services/SharedDataService";
import { useSharedFilters } from "@/contexts/SharedFilterContext";

const KeywordInsights = () => {
  const { keywordsByCategory, classifyKeywords, isRecording } = useCallMetricsStore();
  const [isUpdating, setIsUpdating] = useState(false);
  const { filters } = useSharedFilters();
  const { keywords: sharedKeywords } = useSharedKeywordData(filters);
  
  // Merge live and historical keywords
  const mergedKeywords = {
    positive: [...new Set([...keywordsByCategory.positive, 
      ...sharedKeywords.filter(k => k.category === 'positive').map(k => k.keyword)])],
    neutral: [...new Set([...keywordsByCategory.neutral, 
      ...sharedKeywords.filter(k => k.category === 'neutral').map(k => k.keyword)])],
    negative: [...new Set([...keywordsByCategory.negative, 
      ...sharedKeywords.filter(k => k.category === 'negative').map(k => k.keyword)])]
  };
  
  // Save keywords to Supabase for cross-component consistency
  const saveKeywordsTrends = async () => {
    if (!isRecording || isUpdating) return;
    
    setIsUpdating(true);
    
    try {
      // Process each category
      for (const [category, keywords] of Object.entries(keywordsByCategory)) {
        // Skip if no keywords
        if (!keywords.length) continue;
        
        // Process each keyword
        for (const keyword of keywords) {
          // First check if keyword exists
          const { data, error } = await supabase
            .from('keyword_trends')
            .select('*')
            .eq('keyword', keyword)
            .eq('category', category)
            .single();
            
          if (error && error.code !== 'PGRST116') { // Not found is ok
            console.error(`Error checking keyword ${keyword}:`, error);
            continue;
          }
          
          if (data) {
            // Update existing keyword
            const { error: updateError } = await supabase
              .from('keyword_trends')
              .update({
                count: data.count + 1,
                last_used: new Date().toISOString()
              })
              .eq('id', data.id);
              
            if (updateError) {
              console.error(`Error updating keyword ${keyword}:`, updateError);
            }
          } else {
            // Insert new keyword
            const { error: insertError } = await supabase
              .from('keyword_trends')
              .insert([{
                keyword,
                category,
                count: 1,
                last_used: new Date().toISOString()
              }]);
              
            if (insertError) {
              console.error(`Error inserting keyword ${keyword}:`, insertError);
            }
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
    // Initial classification
    classifyKeywords();
    
    // Reclassify when recording is active
    if (isRecording) {
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
