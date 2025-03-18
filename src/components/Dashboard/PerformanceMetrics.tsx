
import React, { useCallback, useEffect, useState } from "react";
import { LineChart, Line, ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import { ArrowUpRight, TrendingUp, TrendingDown } from "lucide-react";
import GlowingCard from "../ui/GlowingCard";
import AnimatedNumber from "../ui/AnimatedNumber";
import ExpandableChart from "../ui/ExpandableChart";
import { useChartData } from "@/hooks/useChartData";
import { Button } from "../ui/button";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "../ui/chart";
import { getStoredTranscriptions, StoredTranscription } from "@/services/WhisperService";

// Generate empty data for initial state
const generateEmptyData = () => {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  return days.map(day => ({ name: day, score: 0 }));
};

const generateEmptyCallData = () => {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  return days.map(day => ({ name: day, calls: 0 }));
};

const generateEmptyConversionData = () => {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  return days.map(day => ({ name: day, rate: 0 }));
};

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
  // Track actual metrics from transcriptions
  const [performanceScore, setPerformanceScore] = useState(0);
  const [totalCalls, setTotalCalls] = useState(0);
  const [conversionRate, setConversionRate] = useState(0);
  const [performanceChange, setPerformanceChange] = useState(0);
  const [callsChange, setCallsChange] = useState(0);
  const [conversionChange, setConversionChange] = useState(0);

  // Use our custom hooks for data visualization
  const {
    data: performanceData,
    isLoading: isPerformanceLoading,
    refresh: refreshPerformance,
    lastUpdated: performanceLastUpdated,
    simulateDataUpdate: simulatePerformanceUpdate,
    setData: setPerformanceData
  } = useChartData(generateEmptyData());

  const {
    data: callVolumeData,
    isLoading: isCallVolumeLoading,
    refresh: refreshCallVolume,
    lastUpdated: callVolumeLastUpdated,
    simulateDataUpdate: simulateCallVolumeUpdate,
    setData: setCallVolumeData
  } = useChartData(generateEmptyCallData());

  const {
    data: conversionData,
    isLoading: isConversionLoading,
    refresh: refreshConversion,
    lastUpdated: conversionLastUpdated,
    simulateDataUpdate: simulateConversionUpdate,
    setData: setConversionData
  } = useChartData(generateEmptyConversionData());

  // Load actual data from stored transcriptions
  useEffect(() => {
    const transcriptions = getStoredTranscriptions();
    
    if (transcriptions.length === 0) {
      // Reset to zeros if no transcriptions
      setPerformanceScore(0);
      setTotalCalls(0);
      setConversionRate(0);
      setPerformanceChange(0);
      setCallsChange(0);
      setConversionChange(0);
      setPerformanceData(generateEmptyData());
      setCallVolumeData(generateEmptyCallData());
      setConversionData(generateEmptyConversionData());
      return;
    }
    
    // Calculate performance score (average of call scores)
    const avgScore = transcriptions.reduce((sum, t) => sum + (t.callScore || 0), 0) / transcriptions.length;
    setPerformanceScore(Math.round(avgScore));
    
    // Set total calls
    setTotalCalls(transcriptions.length);
    
    // Calculate a conversion rate based on positive sentiment transcriptions
    const positiveTranscriptions = transcriptions.filter(t => t.sentiment === 'positive');
    const calculatedRate = (positiveTranscriptions.length / transcriptions.length) * 100;
    setConversionRate(parseFloat(calculatedRate.toFixed(1)));
    
    // Simulate changes (in a real app, you'd compare to previous periods)
    setPerformanceChange(transcriptions.length > 2 ? 7 : 0);
    setCallsChange(transcriptions.length > 3 ? -3 : 0);
    setConversionChange(transcriptions.length > 5 ? 12 : 0);
    
    // Generate data for charts based on actual transcriptions
    generateChartData(transcriptions);
  }, [setPerformanceData, setCallVolumeData, setConversionData]);
  
  // Generate meaningful chart data from transcriptions
  const generateChartData = (transcriptions: StoredTranscription[]) => {
    // Sort transcriptions by date
    const sortedTranscriptions = [...transcriptions].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    
    // Group by day of week
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const dayScores: Record<string, number[]> = {};
    const dayCounts: Record<string, number> = {};
    const dayConversions: Record<string, number[]> = {};
    
    // Initialize empty arrays for each day
    dayNames.forEach(day => {
      dayScores[day] = [];
      dayCounts[day] = 0;
      dayConversions[day] = [];
    });
    
    // Populate data
    sortedTranscriptions.forEach(t => {
      const date = new Date(t.date);
      const dayName = dayNames[date.getDay()];
      
      if (t.callScore) {
        dayScores[dayName].push(t.callScore);
      }
      
      dayCounts[dayName]++;
      
      // Consider a call "converted" if sentiment is positive
      const isConverted = t.sentiment === 'positive' ? 1 : 0;
      dayConversions[dayName].push(isConverted);
    });
    
    // Calculate averages for performance scores
    const newPerformanceData = dayNames.map(day => ({
      name: day,
      score: dayScores[day].length > 0 
        ? Math.round(dayScores[day].reduce((sum, score) => sum + score, 0) / dayScores[day].length)
        : 0
    }));
    
    // Create call volume data
    const newCallVolumeData = dayNames.map(day => ({
      name: day,
      calls: dayCounts[day]
    }));
    
    // Calculate conversion rates
    const newConversionData = dayNames.map(day => ({
      name: day,
      rate: dayConversions[day].length > 0
        ? Math.round((dayConversions[day].reduce((sum, val) => sum + val, 0) / dayConversions[day].length) * 100)
        : 0
    }));
    
    // Update chart data
    setPerformanceData(newPerformanceData);
    setCallVolumeData(newCallVolumeData);
    setConversionData(newConversionData);
  };

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
        value={performanceScore} 
        change={performanceChange}
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
        value={totalCalls} 
        change={callsChange}
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
        value={conversionRate} 
        change={conversionChange}
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
