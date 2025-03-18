
import React from "react";
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DateRange } from "react-day-picker";
import { ChartContainer, ChartTooltipContent } from "../ui/chart";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";

// Mock data
const generateMockData = (days: number) => {
  const data = [];
  const today = new Date();
  
  for (let i = days; i >= 0; i--) {
    const date = new Date();
    date.setDate(today.getDate() - i);
    
    // Random data with some trends
    const callVolume = Math.floor(Math.random() * 20) + 10 + (i % 5 === 0 ? 15 : 0);
    const successRate = Math.min(100, Math.max(40, 65 + Math.sin(i / 10) * 25));
    const avgDuration = Math.floor(Math.random() * 5) + 4 + (i % 7 === 0 ? 3 : 0);
    
    data.push({
      date: format(date, "MMM dd"),
      callVolume,
      successRate,
      avgDuration,
      conversion: Math.min(60, Math.max(10, 30 + Math.cos(i / 8) * 15))
    });
  }
  
  return data;
};

interface HistoricalTrendsProps {
  dateRange: DateRange | undefined;
}

const HistoricalTrends = ({ dateRange }: HistoricalTrendsProps) => {
  // Calculate days in range or default to 30
  const days = dateRange?.from && dateRange?.to 
    ? Math.round((dateRange.to.getTime() - dateRange.from.getTime()) / (1000 * 60 * 60 * 24))
    : 30;

  const data = generateMockData(days);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card className="col-span-1 lg:col-span-2">
        <CardHeader>
          <CardTitle>Performance Trends Over Time</CardTitle>
          <CardDescription>
            View how your key metrics have changed over the selected period
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="callVolume">
            <TabsList className="mb-4">
              <TabsTrigger value="callVolume">Call Volume</TabsTrigger>
              <TabsTrigger value="successRate">Success Rate</TabsTrigger>
              <TabsTrigger value="avgDuration">Avg. Duration</TabsTrigger>
              <TabsTrigger value="conversion">Conversion</TabsTrigger>
            </TabsList>
            
            <TabsContent value="callVolume" className="h-[400px]">
              <ChartContainer
                config={{
                  callVolume: {
                    label: "Call Volume",
                    theme: {
                      light: "#8B5CF6",
                      dark: "#8B5CF6",
                    },
                  },
                  average: {
                    label: "30-day Average",
                    theme: {
                      light: "#00F0FF",
                      dark: "#00F0FF",
                    },
                  },
                }}
              >
                <AreaChart data={data}>
                  <defs>
                    <linearGradient id="colorCallVolume" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip content={<ChartTooltipContent />} />
                  <Legend />
                  <Area 
                    type="monotone" 
                    dataKey="callVolume" 
                    stroke="var(--color-callVolume)" 
                    fillOpacity={1} 
                    fill="url(#colorCallVolume)" 
                    activeDot={{ r: 8 }} 
                  />
                  <Line 
                    name="30-day Average"
                    type="monotone"
                    dataKey={() => {
                      return Math.round(data.reduce((acc, curr) => acc + curr.callVolume, 0) / data.length);
                    }}
                    stroke="var(--color-average)"
                    strokeDasharray="5 5"
                  />
                </AreaChart>
              </ChartContainer>
            </TabsContent>
            
            <TabsContent value="successRate" className="h-[400px]">
              <ChartContainer
                config={{
                  successRate: {
                    label: "Success Rate",
                    theme: {
                      light: "#06D6A0",
                      dark: "#06D6A0",
                    },
                  },
                  target: {
                    label: "Target (70%)",
                    theme: {
                      light: "#FF5470",
                      dark: "#FF5470",
                    },
                  },
                }}
              >
                <LineChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip content={<ChartTooltipContent />} />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="successRate" 
                    stroke="var(--color-successRate)" 
                    strokeWidth={2} 
                    activeDot={{ r: 8 }} 
                  />
                  <Line 
                    name="Target (70%)"
                    type="monotone"
                    dataKey={() => 70}
                    stroke="var(--color-target)"
                    strokeDasharray="5 5"
                  />
                </LineChart>
              </ChartContainer>
            </TabsContent>
            
            <TabsContent value="avgDuration" className="h-[400px]">
              <ChartContainer
                config={{
                  avgDuration: {
                    label: "Avg. Duration (minutes)",
                    theme: {
                      light: "#F97316",
                      dark: "#F97316",
                    },
                  },
                }}
              >
                <LineChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip content={<ChartTooltipContent />} />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="avgDuration" 
                    stroke="var(--color-avgDuration)" 
                    strokeWidth={2} 
                    activeDot={{ r: 8 }} 
                  />
                </LineChart>
              </ChartContainer>
            </TabsContent>
            
            <TabsContent value="conversion" className="h-[400px]">
              <ChartContainer
                config={{
                  conversion: {
                    label: "Conversion Rate (%)",
                    theme: {
                      light: "#0EA5E9",
                      dark: "#0EA5E9",
                    },
                  },
                }}
              >
                <LineChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip content={<ChartTooltipContent />} />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="conversion" 
                    stroke="var(--color-conversion)" 
                    strokeWidth={2} 
                    activeDot={{ r: 8 }} 
                  />
                </LineChart>
              </ChartContainer>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Performance by Time of Day</CardTitle>
          <CardDescription>
            Identify your most productive calling hours
          </CardDescription>
        </CardHeader>
        <CardContent className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={[
                { time: "8 AM", successRate: 42 },
                { time: "9 AM", successRate: 55 },
                { time: "10 AM", successRate: 70 },
                { time: "11 AM", successRate: 81 },
                { time: "12 PM", successRate: 60 },
                { time: "1 PM", successRate: 55 },
                { time: "2 PM", successRate: 73 },
                { time: "3 PM", successRate: 82 },
                { time: "4 PM", successRate: 76 },
                { time: "5 PM", successRate: 64 },
              ]}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" />
              <YAxis domain={[0, 100]} />
              <Tooltip />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="successRate" 
                name="Success Rate (%)" 
                stroke="#8B5CF6" 
                activeDot={{ r: 8 }} 
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Performance by Day of Week</CardTitle>
          <CardDescription>
            Identify your most productive days
          </CardDescription>
        </CardHeader>
        <CardContent className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={[
                { day: "Mon", successRate: 65 },
                { day: "Tue", successRate: 72 },
                { day: "Wed", successRate: 75 },
                { day: "Thu", successRate: 80 },
                { day: "Fri", successRate: 68 },
                { day: "Sat", successRate: 55 },
                { day: "Sun", successRate: 50 },
              ]}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis domain={[0, 100]} />
              <Tooltip />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="successRate" 
                name="Success Rate (%)" 
                stroke="#06D6A0" 
                activeDot={{ r: 8 }} 
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};

export default HistoricalTrends;
