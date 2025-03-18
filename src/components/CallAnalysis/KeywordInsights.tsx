
import React, { useEffect } from 'react';
import { useCallMetricsStore } from '@/store/useCallMetricsStore';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, ThumbsUp, ThumbsDown, Minus } from 'lucide-react';

const KeywordInsights = () => {
  const { keywordsByCategory, classifyKeywords, isRecording } = useCallMetricsStore();
  
  useEffect(() => {
    // Initial classification
    classifyKeywords();
    
    // Reclassify when recording is active
    if (isRecording) {
      const interval = setInterval(classifyKeywords, 3000);
      return () => clearInterval(interval);
    }
  }, [classifyKeywords, isRecording]);
  
  if (!isRecording && 
      keywordsByCategory.positive.length === 0 && 
      keywordsByCategory.neutral.length === 0 && 
      keywordsByCategory.negative.length === 0) {
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
              {keywordsByCategory.positive.length > 0 ? (
                keywordsByCategory.positive.map((keyword, index) => (
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
              {keywordsByCategory.neutral.length > 0 ? (
                keywordsByCategory.neutral.map((keyword, index) => (
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
              {keywordsByCategory.negative.length > 0 ? (
                keywordsByCategory.negative.map((keyword, index) => (
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
