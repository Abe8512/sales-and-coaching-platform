import React, { useMemo } from "react";
import { LineChart, Line, ResponsiveContainer, AreaChart, Area, BarChart, Bar, Tooltip } from "recharts";
import { TrendingUp, TrendingDown, BarChart3, LineChart as LineChartIcon, AreaChart as AreaChartIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import GlowingCard from "../ui/GlowingCard";
import AnimatedNumber from "../ui/AnimatedNumber";
import { useRealTimeTeamMetrics } from "@/services/RealTimeMetricsService";
import { useSharedFilters } from "@/contexts/SharedFilterContext";
import { Skeleton } from "../ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useSentimentTrends } from "@/services/SharedDataService";

// Custom tooltip component for charts
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white dark:bg-dark-purple p-2 rounded-md shadow-md border border-gray-200 dark:border-gray-700">
        <p className="font-medium">{`${label}`}</p>
        <p className="text-neon-purple">{`${payload[0].name}: ${payload[0].value}`}</p>
      </div>
    );
  }
  return null;
};

interface MetricCardProps {
  title: string;
  value: number;
  change: number;
  gradient?: "blue" | "purple" | "pink" | "green";
  suffix?: string;
  children?: React.ReactNode;
  onClick?: () => void;
  isLoading?: boolean;
}

const MetricCard = ({ title, value, change, gradient = "blue", suffix = "", children, onClick, isLoading = false }: MetricCardProps) => {
  const displayValue = value !== undefined ? value : 0;
  
  return (
    <GlowingCard 
      gradient={gradient} 
      className="h-full transition-all duration-300 hover:scale-[1.02] cursor-pointer backdrop-blur-sm" 
      onClick={onClick}
    >
      <div className="flex flex-col h-full">
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-sm font-medium text-gray-400">{title}</h3>
          {!isLoading && (
            <div className={`flex items-center text-xs font-medium px-2 py-1 rounded-full ${change >= 0 ? "bg-neon-green/20 text-neon-green" : "bg-neon-red/20 text-neon-red"}`}>
              {change >= 0 ? <TrendingUp size={12} className="mr-1" /> : <TrendingDown size={12} className="mr-1" />}
              {Math.abs(change)}%
            </div>
          )}
        </div>
        
        <div className="mb-3">
          {isLoading ? (
            <Skeleton className="h-8 w-24" />
          ) : (
            <AnimatedNumber 
              value={displayValue} 
              className="text-2xl font-bold text-white"
              suffix={suffix}
            />
          )}
        </div>
        
        <div className="mt-auto">
          {isLoading ? (
            <Skeleton className="w-full h-20" />
          ) : children}
        </div>
      </div>
    </GlowingCard>
  );
};

interface PerformanceMetricsProps {
  fullWidth?: boolean;
}

const PerformanceMetrics = ({ fullWidth = false }: PerformanceMetricsProps) => {
  const navigate = useNavigate();
  const { filters } = useSharedFilters();
  const { toast } = useToast();
  
  const [metrics, isLoading] = useRealTimeTeamMetrics(filters);
  const { sentimentData, isLoading: sentimentLoading } = useSentimentTrends(filters);
  
  // Create safe metrics with defaults when loading or undefined
  const safeMetrics = useMemo(() => {
    if (isLoading || !metrics) {
      return {
        performanceScore: 75,
        totalCalls: 42,
        conversionRate: 28
      };
    }
    
    return {
      performanceScore: metrics.performanceScore ?? 75,
      totalCalls: metrics.totalCalls ?? 42, 
      conversionRate: metrics.conversionRate ?? 28
    };
  }, [metrics, isLoading]);
  
  // Generate real chart data based on sentiment trends
  const chartData = useMemo(() => {
    // Default empty data structure
    const defaultData = {
      performanceData: Array(7).fill(0).map((_, i) => ({ 
        name: `Day ${i+1}`, 
        score: 0 
      })),
      callVolumeData: Array(7).fill(0).map((_, i) => ({ 
        name: `Day ${i+1}`, 
        calls: 0 
      })),
      conversionData: Array(7).fill(0).map((_, i) => ({ 
        name: `Day ${i+1}`, 
        rate: 0 
      }))
    };
    
    if (sentimentLoading || !sentimentData || sentimentData.length === 0) {
      return defaultData;
    }
    
    // Group sentiment data by date
    const groupedByDate = sentimentData.reduce((acc, item) => {
      if (!acc[item.date]) {
        acc[item.date] = {
          positive: 0,
          neutral: 0,
          negative: 0
        };
      }
      
      if (item.label === 'positive') {
        acc[item.date].positive = item.value;
      } else if (item.label === 'neutral') {
        acc[item.date].neutral = item.value;
      } else if (item.label === 'negative') {
        acc[item.date].negative = item.value;
      }
      
      return acc;
    }, {} as Record<string, {positive: number, neutral: number, negative: number}>);
    
    // Sort dates
    const sortedDates = Object.keys(groupedByDate).sort();
    
    // Limit to last 7 days
    const recentDates = sortedDates.slice(-7);
    
    // Create formatted chart data
    const performanceData = recentDates.map(date => {
      const data = groupedByDate[date];
      // Calculate performance score based on sentiment (positive value has more weight)
      const score = Math.round((data.positive * 0.7 + data.neutral * 0.2) / (data.positive + data.neutral + data.negative) * 100);
      return {
        name: date.split('-').slice(1).join('/'), // Format as MM/DD
        score: isNaN(score) ? 70 : score
      };
    });
    
    const callVolumeData = recentDates.map(date => {
      const data = groupedByDate[date];
      // Sum of all sentiment counts is a good approximation of call volume
      const calls = data.positive + data.neutral + data.negative;
      return {
        name: date.split('-').slice(1).join('/'), // Format as MM/DD
        calls
      };
    });
    
    const conversionData = recentDates.map(date => {
      const data = groupedByDate[date];
      // Conversion rate is approximated by positive sentiment percentage
      const rate = Math.round(data.positive / (data.positive + data.neutral + data.negative) * 100);
      return {
        name: date.split('-').slice(1).join('/'), // Format as MM/DD
        rate: isNaN(rate) ? 0 : rate
      };
    });
    
    return { performanceData, callVolumeData, conversionData };
  }, [sentimentData, sentimentLoading]);
  
  // Calculate changes based on previous metrics
  const performanceChange = useMemo(() => {
    if (!chartData.performanceData || chartData.performanceData.length < 2) return 0;
    
    const currentValue = chartData.performanceData[chartData.performanceData.length - 1].score;
    const previousValue = chartData.performanceData[chartData.performanceData.length - 2].score;
    
    if (previousValue === 0) return 0;
    return Math.round(((currentValue - previousValue) / previousValue) * 100);
  }, [chartData.performanceData]);
  
  const callsChange = useMemo(() => {
    if (!chartData.callVolumeData || chartData.callVolumeData.length < 2) return 0;
    
    const currentValue = chartData.callVolumeData[chartData.callVolumeData.length - 1].calls;
    const previousValue = chartData.callVolumeData[chartData.callVolumeData.length - 2].calls;
    
    if (previousValue === 0) return 0;
    return Math.round(((currentValue - previousValue) / previousValue) * 100);
  }, [chartData.callVolumeData]);
  
  const conversionChange = useMemo(() => {
    if (!chartData.conversionData || chartData.conversionData.length < 2) return 0;
    
    const currentValue = chartData.conversionData[chartData.conversionData.length - 1].rate;
    const previousValue = chartData.conversionData[chartData.conversionData.length - 2].rate;
    
    if (previousValue === 0) return 0;
    return Math.round(((currentValue - previousValue) / previousValue) * 100);
  }, [chartData.conversionData]);
  
  const navigateToCallActivity = () => {
    navigate("/call-activity");
    toast({
      title: "Navigating to Call Activity",
      description: "View detailed metrics and analysis"
    });
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
      <MetricCard 
        title="Performance Score" 
        value={safeMetrics.performanceScore}
        change={performanceChange}
        gradient="blue"
        onClick={navigateToCallActivity}
        isLoading={isLoading}
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-gray-400">Last 7 days</span>
          <LineChartIcon size={14} className="text-neon-blue" />
            </div>
            <ResponsiveContainer width="100%" height={80}>
          <LineChart data={chartData.performanceData}>
            <Tooltip content={<CustomTooltip />} />
                <Line 
                  type="monotone" 
                  dataKey="score" 
                  stroke="#00F0FF" 
                  strokeWidth={2} 
                  dot={false} 
              activeDot={{ r: 4, strokeWidth: 0, fill: "#00F0FF" }}
                />
              </LineChart>
            </ResponsiveContainer>
      </MetricCard>
      
      <MetricCard 
        title="Total Calls" 
        value={safeMetrics.totalCalls}
        change={callsChange}
        gradient="purple"
        onClick={navigateToCallActivity}
        isLoading={isLoading}
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-gray-400">Last 7 days</span>
          <BarChart3 size={14} className="text-neon-purple" />
            </div>
            <ResponsiveContainer width="100%" height={80}>
          <BarChart data={chartData.callVolumeData}>
            <Tooltip content={<CustomTooltip />} />
                <Bar 
                  dataKey="calls" 
                  fill="#8B5CF6" 
                  radius={[2, 2, 0, 0]} 
                />
              </BarChart>
            </ResponsiveContainer>
      </MetricCard>
      
      <MetricCard 
        title="Conversion Rate" 
        value={safeMetrics.conversionRate}
        change={conversionChange}
        gradient="green"
        suffix="%"
        onClick={navigateToCallActivity}
        isLoading={isLoading}
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-gray-400">Last 7 days</span>
          <AreaChartIcon size={14} className="text-neon-green" />
            </div>
            <ResponsiveContainer width="100%" height={80}>
          <AreaChart data={chartData.conversionData}>
            <Tooltip content={<CustomTooltip />} />
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
              activeDot={{ r: 4, strokeWidth: 0, fill: "#06D6A0" }}
                />
              </AreaChart>
            </ResponsiveContainer>
      </MetricCard>
    </div>
  );
};

export default React.memo(PerformanceMetrics);
