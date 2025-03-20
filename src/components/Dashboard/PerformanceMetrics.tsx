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

// Define mock chart data generator
const generateMockChartData = () => {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  
  const performanceData = days.map((day, index) => ({ 
    name: day, 
    score: Math.floor(Math.random() * 15) + 65
  }));
  
  const callVolumeData = days.map((day, index) => ({ 
    name: day, 
    calls: Math.floor(Math.random() * 10) + 5
  }));
  
  const conversionData = days.map((day, index) => ({ 
    name: day, 
    rate: Math.floor(Math.random() * 15) + 20
  }));
  
  return { performanceData, callVolumeData, conversionData };
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

const PerformanceMetrics = () => {
  const navigate = useNavigate();
  const { filters } = useSharedFilters();
  const { toast } = useToast();
  
  const [metrics, isLoading] = useRealTimeTeamMetrics(filters);
  
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
  
  // Generate chart data
  const chartData = useMemo(() => generateMockChartData(), []);
  
  // Calculate changes based on previous metrics (simplified)
  const performanceChange = 7;
  const callsChange = 5;
  const conversionChange = 12;

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
