import React from 'react';
import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';

interface DataItem {
  [key: string]: string | number;
}

interface BarChartProps {
  data: DataItem[] | Record<string, number>;
  index: string;
  categories: string[];
  colors?: string[];
  valueFormatter?: (value: number) => string;
  className?: string;
}

// Process the data from a record format to an array of objects for Recharts
const processData = (data: Record<string, number>) => {
  return Object.entries(data).map(([name, value]) => ({
    name,
    value
  }));
};

export const BarChart = ({
  data,
  index,
  categories,
  colors = ['#3b82f6', '#a855f7', '#22c55e', '#f59e0b'],
  valueFormatter = (value: number) => `${value}`,
  className = ''
}: BarChartProps) => {
  // If data is a record instead of an array, convert it
  const chartData = Array.isArray(data) ? data : processData(data);
  
  return (
    <div className={`w-full h-full ${className}`}>
      <ResponsiveContainer width="100%" height="100%">
        <RechartsBarChart
          data={chartData}
          margin={{ top: 10, right: 10, left: 10, bottom: 20 }}
        >
          <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
          <XAxis
            dataKey={index}
            tick={{ fontSize: 12 }}
            tickMargin={10}
          />
          <YAxis
            tick={{ fontSize: 12 }}
            tickFormatter={(value) => valueFormatter(value)}
          />
          <Tooltip
            formatter={(value: number) => [
              valueFormatter(value),
              categories.length > 1 ? categories[0] : '',
            ]}
            contentStyle={{
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              borderRadius: '6px',
              padding: '8px',
              boxShadow: '0 2px 5px rgba(0, 0, 0, 0.1)',
              border: '1px solid rgba(0, 0, 0, 0.05)',
            }}
          />
          {categories.length > 1 && <Legend />}
          
          {categories.map((category, index) => (
            <Bar
              key={category}
              dataKey={category}
              fill={colors[index % colors.length]}
              radius={[4, 4, 0, 0]}
            />
          ))}
        </RechartsBarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default BarChart; 