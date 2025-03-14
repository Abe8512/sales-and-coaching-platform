
import React from "react";
import { LineChart, Line, ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { ArrowUpRight, TrendingUp, TrendingDown } from "lucide-react";
import GlowingCard from "../ui/GlowingCard";
import AnimatedNumber from "../ui/AnimatedNumber";

// Mock data
const performanceData = [
  { name: "Mon", score: 82 },
  { name: "Tue", score: 75 },
  { name: "Wed", score: 88 },
  { name: "Thu", score: 84 },
  { name: "Fri", score: 91 },
  { name: "Sat", score: 87 },
  { name: "Sun", score: 94 },
];

const callVolumeData = [
  { name: "Mon", calls: 24 },
  { name: "Tue", calls: 18 },
  { name: "Wed", calls: 32 },
  { name: "Thu", calls: 27 },
  { name: "Fri", calls: 35 },
  { name: "Sat", calls: 22 },
  { name: "Sun", calls: 15 },
];

const conversionData = [
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
  return (
    <div className="grid grid-cols-3 gap-6">
      <MetricCard 
        title="Performance Score" 
        value={94} 
        change={7}
        gradient="blue"
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
      </MetricCard>
      
      <MetricCard 
        title="Total Calls" 
        value={173} 
        change={-3}
        gradient="purple"
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
      </MetricCard>
      
      <MetricCard 
        title="Conversion Rate" 
        value={35.8} 
        change={12}
        gradient="green"
        suffix="%"
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
      </MetricCard>
    </div>
  );
};

export default PerformanceMetrics;
