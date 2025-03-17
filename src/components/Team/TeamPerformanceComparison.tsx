
import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart";

interface TeamMember {
  id: number;
  name: string;
  performance: number;
  calls: number;
  conversion: number;
}

interface TeamPerformanceComparisonProps {
  teamMembers: TeamMember[];
}

const TeamPerformanceComparison = ({ teamMembers }: TeamPerformanceComparisonProps) => {
  const [selectedMetric, setSelectedMetric] = useState('performance');
  
  const getMetricLabel = () => {
    switch (selectedMetric) {
      case 'performance': return 'Performance Score';
      case 'calls': return 'Total Calls';
      case 'conversion': return 'Conversion Rate';
      default: return 'Performance Score';
    }
  };
  
  const getChartData = () => {
    return teamMembers.map(member => ({
      name: member.name,
      value: member[selectedMetric as keyof Pick<TeamMember, 'performance' | 'calls' | 'conversion'>],
    }));
  };

  const getBarColor = (metric: string) => {
    switch (metric) {
      case 'performance': return '#A855F7'; // Purple
      case 'calls': return '#00F0FF';       // Blue
      case 'conversion': return '#06D6A0';  // Green
      default: return '#A855F7';
    }
  };

  return (
    <div>
      <Tabs 
        defaultValue="performance" 
        value={selectedMetric}
        onValueChange={setSelectedMetric}
        className="mb-6"
      >
        <TabsList>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="calls">Call Volume</TabsTrigger>
          <TabsTrigger value="conversion">Conversion Rate</TabsTrigger>
        </TabsList>
      </Tabs>
      
      <div className="h-[400px]">
        <ChartContainer
          config={{
            value: {
              label: getMetricLabel(),
              theme: {
                light: getBarColor(selectedMetric),
                dark: getBarColor(selectedMetric),
              },
            },
          }}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={getChartData()}
              margin={{ top: 20, right: 30, left: 20, bottom: 70 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={70} />
              <YAxis />
              <Tooltip content={<ChartTooltipContent />} />
              <Legend />
              <Bar 
                dataKey="value" 
                fill={`var(--color-value)`}
                radius={[4, 4, 0, 0]}
                name={getMetricLabel()}
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
        <Card className="p-4 text-center">
          <h3 className="text-sm text-muted-foreground">Avg Performance</h3>
          <p className="text-2xl font-bold mt-1">
            {(teamMembers.reduce((sum, m) => sum + m.performance, 0) / teamMembers.length).toFixed(1)}%
          </p>
        </Card>
        <Card className="p-4 text-center">
          <h3 className="text-sm text-muted-foreground">Avg Calls</h3>
          <p className="text-2xl font-bold mt-1">
            {Math.round(teamMembers.reduce((sum, m) => sum + m.calls, 0) / teamMembers.length)}
          </p>
        </Card>
        <Card className="p-4 text-center">
          <h3 className="text-sm text-muted-foreground">Avg Conversion</h3>
          <p className="text-2xl font-bold mt-1">
            {(teamMembers.reduce((sum, m) => sum + m.conversion, 0) / teamMembers.length).toFixed(1)}%
          </p>
        </Card>
      </div>
    </div>
  );
};

export default TeamPerformanceComparison;
