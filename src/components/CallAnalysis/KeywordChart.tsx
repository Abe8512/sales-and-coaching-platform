
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { KeywordTrend, KeywordCategory } from '@/hooks/useKeywordTrends';

interface KeywordChartProps {
  keywords: KeywordTrend[];
  category: KeywordCategory;
}

const KeywordChart: React.FC<KeywordChartProps> = ({ keywords, category }) => {
  // Sort by count (highest first) and limit to top 10
  const chartData = [...keywords]
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Get color based on category
  const getCategoryColor = (cat: KeywordCategory): string => {
    switch (cat) {
      case 'positive': return '#10B981';
      case 'negative': return '#EF4444';
      default: return '#3B82F6';
    }
  };

  if (chartData.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <p className="text-muted-foreground">No keyword data available yet. Complete a call to see trends.</p>
      </div>
    );
  }

  return (
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
          fill={getCategoryColor(category)}
        />
      </BarChart>
    </ResponsiveContainer>
  );
};

export default KeywordChart;
