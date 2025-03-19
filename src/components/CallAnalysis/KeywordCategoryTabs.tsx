
import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { KeywordCategory } from '@/hooks/useKeywordTrends';

interface KeywordCategoryTabsProps {
  activeCategory: KeywordCategory;
  onCategoryChange: (category: KeywordCategory) => void;
}

const KeywordCategoryTabs: React.FC<KeywordCategoryTabsProps> = ({ 
  activeCategory, 
  onCategoryChange 
}) => {
  return (
    <Tabs 
      defaultValue="positive" 
      value={activeCategory}
      onValueChange={(value) => onCategoryChange(value as KeywordCategory)}
      className="mb-4"
    >
      <TabsList>
        <TabsTrigger value="positive">Positive</TabsTrigger>
        <TabsTrigger value="neutral">Neutral</TabsTrigger>
        <TabsTrigger value="negative">Negative</TabsTrigger>
      </TabsList>
    </Tabs>
  );
};

export default KeywordCategoryTabs;
