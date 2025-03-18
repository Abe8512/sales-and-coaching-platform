
import React, { useEffect } from "react";
import { LineChart, Line, ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import { TrendingUp, TrendingDown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import GlowingCard from "../ui/GlowingCard";
import AnimatedNumber from "../ui/AnimatedNumber";
import ExpandableChart from "../ui/ExpandableChart";
import { useSharedTeamMetrics, useSharedKeywordData, useSharedSentimentData } from "@/services/SharedDataService";
import { useSharedFilters } from "@/contexts/SharedFilterContext";
import { Button } from "../ui/button";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "../ui/chart";

interface MetricCardProps {
  title: string;
  value: number;
  change: number;
  gradient?: "blue" | "purple" | "pink" | "green";
  suffix?: string;
  children?: React.ReactNode;
  onClick?: () => void;
}

const MetricCard = ({ title, value, change, gradient = "blue", suffix = "", children, onClick }: MetricCardProps) => {
  return (
    <GlowingCard gradient={gradient} className="h-full" onClick={onClick}>
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
  const navigate = useNavigate();
  const { filters } = useSharedFilters();
  
  const { metrics, isLoading: isMetricsLoading, refreshMetrics, lastUpdated: metricsLastUpdated } = useSharedTeamMetrics(filters);
  const { keywords, isLoading: isKeywordsLoading } = useSharedKeywordData(filters);
  const { sentiments, isLoading: isSentimentsLoading } = useSharedSentimentData(filters);
  
  // Generate sample data for charts
  const generatePerformanceData = () => {
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    return days.map(day => ({ name: day, score: Math.round(Math.random() * metrics.performanceScore) }));
  };
  
  const generateCallVolumeData = () => {
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const totalPerDay = metrics.totalCalls / 7;
    return days.map(day => ({ name: day, calls: Math.round(totalPerDay * (0.7 + Math.random() * 0.6)) }));
  };
  
  const generateConversionData = () => {
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    return days.map(day => ({ name: day, rate: Math.round(metrics.conversionRate * (0.8 + Math.random() * 0.4)) }));
  };

  // Create data for charts
  const performanceData = generatePerformanceData();
  const callVolumeData = generateCallVolumeData();
  const conversionData = generateConversionData();
  
  const navigateToCallActivity = () => {
    navigate("/call-activity");
  };

  const performanceChange = 7;
  const callsChange = metrics.totalCalls > 10 ? 5 : -3;
  const conversionChange = 12;

  const expandedPerformanceChart = (
    <div className="space-y-4">
      <div className="flex justify-between">
        <div>
          <h3 className="text-lg font-bold">Performance Score Trends</h3>
          <p className="text-sm text-muted-foreground">Detailed view of your performance metrics over time</p>
        </div>
        <Button onClick={refreshMetrics}>Simulate Update</Button>
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
            {performanceData.length > 0 && performanceData.some(item => item.score > 0)
              ? Math.round(performanceData.reduce((acc, item) => acc + item.score, 0) / performanceData.filter(item => item.score > 0).length)
              : 0}
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
            {performanceData.some(item => item.score > 0)
              ? Math.min(...performanceData.filter(item => item.score > 0).map(item => item.score))
              : 0}
          </div>
        </div>
      </div>
    </div>
  );

  const expandedCallVolumeChart = (
    <div className="space-y-4">
      <div className="flex justify-between">
        <div>
          <h3 className="text-lg font-bold">Call Volume Analysis</h3>
          <p className="text-sm text-muted-foreground">Detailed view of your call volume metrics</p>
        </div>
        <Button onClick={refreshMetrics}>Simulate Update</Button>
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
              dataKey={() => {
                const total = callVolumeData.reduce((acc, item) => acc + item.calls, 0);
                return total > 0 ? Math.round(total / 7) : 0;
              }}
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
            {Math.round(callVolumeData.reduce((acc, item) => acc + item.calls, 0) / 7)}
          </div>
        </div>
        <div className="p-4 border rounded-lg">
          <div className="text-sm text-muted-foreground">Peak Day</div>
          <div className="text-2xl font-bold">
            {callVolumeData.reduce((max, item) => max.calls > item.calls ? max : item, { name: '-', calls: 0 }).name}
          </div>
        </div>
      </div>
    </div>
  );

  const expandedConversionChart = (
    <div className="space-y-4">
      <div className="flex justify-between">
        <div>
          <h3 className="text-lg font-bold">Conversion Rate Trends</h3>
          <p className="text-sm text-muted-foreground">Detailed view of your conversion metrics</p>
        </div>
        <Button onClick={refreshMetrics}>Simulate Update</Button>
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
            <YAxis domain={[0, 100]} />
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
            {conversionData.some(item => item.rate > 0)
              ? Math.round(conversionData.reduce((acc, item) => acc + item.rate, 0) / 
                  conversionData.filter(item => item.rate > 0).length)
              : 0}%
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
        value={metrics.performanceScore || 0} 
        change={performanceChange}
        gradient="blue"
        onClick={navigateToCallActivity}
      >
        <ExpandableChart 
          title="Weekly Performance" 
          expandedContent={expandedPerformanceChart}
          isLoading={isMetricsLoading}
          onRefresh={refreshMetrics}
          lastUpdated={metricsLastUpdated}
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
        value={metrics.totalCalls} 
        change={callsChange}
        gradient="purple"
        onClick={navigateToCallActivity}
      >
        <ExpandableChart 
          title="Call Volume" 
          expandedContent={expandedCallVolumeChart}
          isLoading={isMetricsLoading}
          onRefresh={refreshMetrics}
          lastUpdated={metricsLastUpdated}
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
        value={metrics.conversionRate} 
        change={conversionChange}
        gradient="green"
        suffix="%"
        onClick={navigateToCallActivity}
      >
        <ExpandableChart 
          title="Conversion Trends" 
          expandedContent={expandedConversionChart}
          isLoading={isMetricsLoading}
          onRefresh={refreshMetrics}
          lastUpdated={metricsLastUpdated}
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
