
import React, { useCallback } from "react";
import { LineChart, Line, ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import { ArrowUpRight, TrendingUp, TrendingDown } from "lucide-react";
import GlowingCard from "../ui/GlowingCard";
import AnimatedNumber from "../ui/AnimatedNumber";
import ExpandableChart from "../ui/ExpandableChart";
import { useChartData } from "@/hooks/useChartData";
import { Button } from "../ui/button";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "../ui/chart";

// Mock data
const initialPerformanceData = [
  { name: "Mon", score: 82 },
  { name: "Tue", score: 75 },
  { name: "Wed", score: 88 },
  { name: "Thu", score: 84 },
  { name: "Fri", score: 91 },
  { name: "Sat", score: 87 },
  { name: "Sun", score: 94 },
];

const initialCallVolumeData = [
  { name: "Mon", calls: 24 },
  { name: "Tue", calls: 18 },
  { name: "Wed", calls: 32 },
  { name: "Thu", calls: 27 },
  { name: "Fri", calls: 35 },
  { name: "Sat", calls: 22 },
  { name: "Sun", calls: 15 },
];

const initialConversionData = [
  { name: "Mon", rate: 22 },
  { name: "Tue", rate: 18 },
  { name: "Wed", rate: 25 },
  { name: "Thu", rate: 30 },
  { name: "Fri", rate: 35 },
  { name: "Sat", rate: 28 },
  { name: "Sun", rate: 32 },
];

interface MetricCardProps {
  title: string;
  value: number;
  change: number;
  gradient?: "blue" | "purple" | "pink" | "green";
  suffix?: string;
  children?: React.ReactNode;
}

const MetricCard = ({ title, value, change, gradient = "blue", suffix = "", children }: MetricCardProps) => {
  return (
    <GlowingCard gradient={gradient} className="h-full">
      <div className="flex flex-col h-full">
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-sm font-medium text-gray-400">{title}</h3>
          <div className={`flex items-center text-xs font-medium ${change >= 0 ? "text-neon-green" : "text-neon-red"}`}>
            {change >= 0 ? <TrendingUp size={12} className="mr-1" /> : <TrendingDown size={12} className="mr-1" />}
            {Math.abs(change)}%
          </div>
        </div>
        
        <div className="mb-3">
          <AnimatedNumber 
            value={value} 
            className="text-2xl font-bold text-white"
            suffix={suffix}
          />
        </div>
        
        <div className="mt-auto">
          {children}
        </div>
      </div>
    </GlowingCard>
  );
};

const PerformanceMetrics = () => {
  // Use our custom hooks for real-time data
  const {
    data: performanceData,
    isLoading: isPerformanceLoading,
    refresh: refreshPerformance,
    lastUpdated: performanceLastUpdated,
    simulateDataUpdate: simulatePerformanceUpdate
  } = useChartData(initialPerformanceData);

  const {
    data: callVolumeData,
    isLoading: isCallVolumeLoading,
    refresh: refreshCallVolume,
    lastUpdated: callVolumeLastUpdated,
    simulateDataUpdate: simulateCallVolumeUpdate
  } = useChartData(initialCallVolumeData);

  const {
    data: conversionData,
    isLoading: isConversionLoading,
    refresh: refreshConversion,
    lastUpdated: conversionLastUpdated,
    simulateDataUpdate: simulateConversionUpdate
  } = useChartData(initialConversionData);

  // Expanded chart content for Performance Score
  const expandedPerformanceChart = (
    <div className="space-y-4">
      <div className="flex justify-between">
        <div>
          <h3 className="text-lg font-bold">Performance Score Trends</h3>
          <p className="text-sm text-muted-foreground">Detailed view of your performance metrics over time</p>
        </div>
        <Button onClick={simulatePerformanceUpdate}>Simulate Update</Button>
      </div>
      
      <div className="h-[400px]">
        <ChartContainer
          config={{
            score: {
              label: "Score",
              theme: {
                light: "#00F0FF",
                dark: "#00F0FF",
              },
            },
            target: {
              label: "Target",
              theme: {
                light: "#8B5CF6",
                dark: "#8B5CF6",
              },
            },
          }}
        >
          <LineChart data={performanceData} margin={{ top: 20, right: 30, left: 20, bottom: 30 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="name" />
            <YAxis domain={[0, 100]} />
            <ChartTooltip
              content={
                <ChartTooltipContent />
              }
            />
            <Legend />
            <Line
              name="Performance Score"
              type="monotone"
              dataKey="score"
              stroke="var(--color-score)"
              activeDot={{ r: 8 }}
              strokeWidth={2}
            />
            <Line
              name="Target"
              type="monotone"
              dataKey={(data) => 85}
              stroke="var(--color-target)"
              strokeDasharray="5 5"
              strokeWidth={2}
            />
          </LineChart>
        </ChartContainer>
      </div>
      
      <div className="grid grid-cols-3 gap-4">
        <div className="p-4 border rounded-lg">
          <div className="text-sm text-muted-foreground">Average Score</div>
          <div className="text-2xl font-bold">
            {Math.round(performanceData.reduce((acc, item) => acc + item.score, 0) / performanceData.length)}
          </div>
        </div>
        <div className="p-4 border rounded-lg">
          <div className="text-sm text-muted-foreground">Highest Score</div>
          <div className="text-2xl font-bold">
            {Math.max(...performanceData.map(item => item.score))}
          </div>
        </div>
        <div className="p-4 border rounded-lg">
          <div className="text-sm text-muted-foreground">Lowest Score</div>
          <div className="text-2xl font-bold">
            {Math.min(...performanceData.map(item => item.score))}
          </div>
        </div>
      </div>
    </div>
  );

  // Expanded chart content for Call Volume
  const expandedCallVolumeChart = (
    <div className="space-y-4">
      <div className="flex justify-between">
        <div>
          <h3 className="text-lg font-bold">Call Volume Analysis</h3>
          <p className="text-sm text-muted-foreground">Detailed view of your call volume metrics</p>
        </div>
        <Button onClick={simulateCallVolumeUpdate}>Simulate Update</Button>
      </div>
      
      <div className="h-[400px]">
        <ChartContainer
          config={{
            calls: {
              label: "Calls",
              theme: {
                light: "#8B5CF6",
                dark: "#8B5CF6",
              },
            },
            average: {
              label: "7-day Average",
              theme: {
                light: "#00F0FF",
                dark: "#00F0FF",
              },
            },
          }}
        >
          <BarChart data={callVolumeData} margin={{ top: 20, right: 30, left: 20, bottom: 30 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="name" />
            <YAxis />
            <ChartTooltip
              content={
                <ChartTooltipContent />
              }
            />
            <Legend />
            <Bar
              name="Call Volume"
              dataKey="calls"
              fill="var(--color-calls)"
              radius={[4, 4, 0, 0]}
            />
            <Line
              name="7-day Average"
              type="monotone"
              dataKey={() => Math.round(callVolumeData.reduce((acc, item) => acc + item.calls, 0) / callVolumeData.length)}
              stroke="var(--color-average)"
              strokeWidth={2}
            />
          </BarChart>
        </ChartContainer>
      </div>
      
      <div className="grid grid-cols-3 gap-4">
        <div className="p-4 border rounded-lg">
          <div className="text-sm text-muted-foreground">Total Calls</div>
          <div className="text-2xl font-bold">
            {callVolumeData.reduce((acc, item) => acc + item.calls, 0)}
          </div>
        </div>
        <div className="p-4 border rounded-lg">
          <div className="text-sm text-muted-foreground">Daily Average</div>
          <div className="text-2xl font-bold">
            {Math.round(callVolumeData.reduce((acc, item) => acc + item.calls, 0) / callVolumeData.length)}
          </div>
        </div>
        <div className="p-4 border rounded-lg">
          <div className="text-sm text-muted-foreground">Peak Day</div>
          <div className="text-2xl font-bold">
            {callVolumeData.reduce((max, item) => max.calls > item.calls ? max : item, { name: '', calls: 0 }).name}
          </div>
        </div>
      </div>
    </div>
  );

  // Expanded chart content for Conversion Rate
  const expandedConversionChart = (
    <div className="space-y-4">
      <div className="flex justify-between">
        <div>
          <h3 className="text-lg font-bold">Conversion Rate Trends</h3>
          <p className="text-sm text-muted-foreground">Detailed view of your conversion metrics</p>
        </div>
        <Button onClick={simulateConversionUpdate}>Simulate Update</Button>
      </div>
      
      <div className="h-[400px]">
        <ChartContainer
          config={{
            rate: {
              label: "Conversion Rate",
              theme: {
                light: "#06D6A0",
                dark: "#06D6A0",
              },
            },
            target: {
              label: "Target",
              theme: {
                light: "#FF5470",
                dark: "#FF5470",
              },
            },
          }}
        >
          <AreaChart data={conversionData} margin={{ top: 20, right: 30, left: 20, bottom: 30 }}>
            <defs>
              <linearGradient id="colorRate" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#06D6A0" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#06D6A0" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="name" />
            <YAxis domain={[0, 50]} />
            <ChartTooltip
              content={
                <ChartTooltipContent />
              }
            />
            <Legend />
            <Area
              name="Conversion Rate"
              type="monotone"
              dataKey="rate"
              stroke="var(--color-rate)"
              fillOpacity={1}
              fill="url(#colorRate)"
              strokeWidth={2}
            />
            <Line
              name="Target Rate"
              type="monotone"
              dataKey={() => 30}
              stroke="var(--color-target)"
              strokeDasharray="5 5"
              strokeWidth={2}
            />
          </AreaChart>
        </ChartContainer>
      </div>
      
      <div className="grid grid-cols-3 gap-4">
        <div className="p-4 border rounded-lg">
          <div className="text-sm text-muted-foreground">Average Rate</div>
          <div className="text-2xl font-bold">
            {Math.round(conversionData.reduce((acc, item) => acc + item.rate, 0) / conversionData.length)}%
          </div>
        </div>
        <div className="p-4 border rounded-lg">
          <div className="text-sm text-muted-foreground">Highest Rate</div>
          <div className="text-2xl font-bold">
            {Math.max(...conversionData.map(item => item.rate))}%
          </div>
        </div>
        <div className="p-4 border rounded-lg">
          <div className="text-sm text-muted-foreground">Days Above Target</div>
          <div className="text-2xl font-bold">
            {conversionData.filter(item => item.rate > 30).length}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="grid grid-cols-3 gap-6">
      <MetricCard 
        title="Performance Score" 
        value={94} 
        change={7}
        gradient="blue"
      >
        <ExpandableChart 
          title="Weekly Performance" 
          expandedContent={expandedPerformanceChart}
          isLoading={isPerformanceLoading}
          onRefresh={simulatePerformanceUpdate}
          lastUpdated={performanceLastUpdated}
        >
          <ResponsiveContainer width="100%" height={80}>
            <LineChart data={performanceData}>
              <Line 
                type="monotone" 
                dataKey="score" 
                stroke="#00F0FF" 
                strokeWidth={2} 
                dot={false} 
              />
            </LineChart>
          </ResponsiveContainer>
        </ExpandableChart>
      </MetricCard>
      
      <MetricCard 
        title="Total Calls" 
        value={173} 
        change={-3}
        gradient="purple"
      >
        <ExpandableChart 
          title="Call Volume" 
          expandedContent={expandedCallVolumeChart}
          isLoading={isCallVolumeLoading}
          onRefresh={simulateCallVolumeUpdate}
          lastUpdated={callVolumeLastUpdated}
        >
          <ResponsiveContainer width="100%" height={80}>
            <BarChart data={callVolumeData}>
              <Bar 
                dataKey="calls" 
                fill="#8B5CF6" 
                radius={[2, 2, 0, 0]} 
              />
            </BarChart>
          </ResponsiveContainer>
        </ExpandableChart>
      </MetricCard>
      
      <MetricCard 
        title="Conversion Rate" 
        value={35.8} 
        change={12}
        gradient="green"
        suffix="%"
      >
        <ExpandableChart 
          title="Conversion Trends" 
          expandedContent={expandedConversionChart}
          isLoading={isConversionLoading}
          onRefresh={simulateConversionUpdate}
          lastUpdated={conversionLastUpdated}
        >
          <ResponsiveContainer width="100%" height={80}>
            <AreaChart data={conversionData}>
              <defs>
                <linearGradient id="colorRate" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#06D6A0" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#06D6A0" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <Area 
                type="monotone" 
                dataKey="rate" 
                stroke="#06D6A0" 
                strokeWidth={2}
                fillOpacity={1} 
                fill="url(#colorRate)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </ExpandableChart>
      </MetricCard>
    </div>
  );
};

export default PerformanceMetrics;
