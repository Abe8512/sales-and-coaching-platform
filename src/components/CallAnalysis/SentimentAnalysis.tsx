
import React from "react";
import { LineChart, Line, ResponsiveContainer, ReferenceLine, CartesianGrid, XAxis, YAxis, Legend, Tooltip } from "recharts";
import { Info } from "lucide-react";
import GlowingCard from "../ui/GlowingCard";
import ExpandableChart from "../ui/ExpandableChart";
import { useChartData } from "@/hooks/useChartData";
import { Button } from "../ui/button";
import { ChartContainer, ChartTooltipContent } from "../ui/chart";

const SentimentAnalysis = () => {
  // Mock data for sentiment analysis
  const initialSentimentData = [
    { time: "00:00", agent: 0.6, customer: 0.2 },
    { time: "00:30", agent: 0.7, customer: 0.1 },
    { time: "01:00", agent: 0.65, customer: -0.1 },
    { time: "01:30", agent: 0.5, customer: -0.3 },
    { time: "02:00", agent: 0.3, customer: -0.5 },
    { time: "02:30", agent: 0.2, customer: -0.6 },
    { time: "03:00", agent: 0.4, customer: -0.4 },
    { time: "03:30", agent: 0.5, customer: -0.2 },
    { time: "04:00", agent: 0.6, customer: 0 },
    { time: "04:30", agent: 0.65, customer: 0.2 },
    { time: "05:00", agent: 0.7, customer: 0.4 },
    { time: "05:30", agent: 0.8, customer: 0.5 },
    { time: "06:00", agent: 0.75, customer: 0.6 },
    { time: "06:30", agent: 0.7, customer: 0.5 },
    { time: "07:00", agent: 0.65, customer: 0.4 },
    { time: "07:30", agent: 0.6, customer: 0.3 },
    { time: "08:00", agent: 0.7, customer: 0.5 },
  ];

  const {
    data: sentimentData,
    isLoading,
    refresh,
    lastUpdated,
    simulateDataUpdate
  } = useChartData(initialSentimentData);

  const sentimentKeyMoments = [
    {
      time: "00:42",
      description: "Agent interrupted customer, causing negative sentiment",
      type: "negative",
    },
    {
      time: "03:15",
      description: "Agent acknowledged customer's concerns, improving sentiment",
      type: "positive",
    },
    {
      time: "06:05",
      description: "Agent proposed solution aligned with customer needs",
      type: "positive",
    },
  ];

  // Expanded chart content
  const expandedSentimentChart = (
    <div className="space-y-4">
      <div className="flex justify-between">
        <div>
          <h3 className="text-lg font-bold">Detailed Sentiment Analysis</h3>
          <p className="text-sm text-muted-foreground">Track sentiment changes throughout the call</p>
        </div>
        <Button onClick={simulateDataUpdate}>Simulate Update</Button>
      </div>
      
      <div className="h-[400px]">
        <ChartContainer
          config={{
            agent: {
              label: "Agent",
              theme: {
                light: "#00F0FF",
                dark: "#00F0FF",
              },
            },
            customer: {
              label: "Customer",
              theme: {
                light: "#FF4DCD",
                dark: "#FF4DCD",
              },
            },
          }}
        >
          <LineChart 
            data={sentimentData} 
            margin={{ top: 20, right: 30, left: 20, bottom: 30 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="time" />
            <YAxis domain={[-1, 1]} />
            <Tooltip content={<ChartTooltipContent />} />
            <Legend />
            <ReferenceLine y={0} stroke="rgba(255,255,255,0.2)" />
            <Line
              type="monotone"
              dataKey="agent"
              stroke="var(--color-agent)"
              strokeWidth={2}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
              name="Agent"
            />
            <Line
              type="monotone"
              dataKey="customer"
              stroke="var(--color-customer)"
              strokeWidth={2}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
              name="Customer"
            />
          </LineChart>
        </ChartContainer>
      </div>
      
      <div className="space-y-2">
        <h4 className="font-medium">Sentiment Key Points</h4>
        {sentimentKeyMoments.map((moment, index) => (
          <div 
            key={index} 
            className={`p-4 rounded-lg text-sm flex gap-3 ${
              moment.type === "positive" 
                ? "bg-neon-green/10 border border-neon-green/30" 
                : "bg-neon-red/10 border border-neon-red/30"
            }`}
          >
            <span className={`font-medium w-12 ${
              moment.type === "positive" ? "text-neon-green" : "text-neon-red"
            }`}>
              {moment.time}
            </span>
            <span className="text-foreground">{moment.description}</span>
          </div>
        ))}
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 border rounded-lg">
          <div className="text-sm text-muted-foreground">Average Agent Sentiment</div>
          <div className="text-2xl font-bold">
            {(sentimentData.reduce((acc, item) => acc + item.agent, 0) / sentimentData.length).toFixed(2)}
          </div>
        </div>
        <div className="p-4 border rounded-lg">
          <div className="text-sm text-muted-foreground">Average Customer Sentiment</div>
          <div className="text-2xl font-bold">
            {(sentimentData.reduce((acc, item) => acc + item.customer, 0) / sentimentData.length).toFixed(2)}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <GlowingCard gradient="blue" className="h-full">
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-xl font-bold text-white">Sentiment Analysis</h2>
        <button className="text-gray-400 hover:text-white">
          <Info className="h-5 w-5" />
        </button>
      </div>
      
      <ExpandableChart 
        title="Call Sentiment" 
        subtitle="Agent and customer sentiment throughout the call"
        expandedContent={expandedSentimentChart}
        isLoading={isLoading}
        onRefresh={simulateDataUpdate}
        lastUpdated={lastUpdated}
        className="mb-4"
      >
        <div className="h-60">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={sentimentData}>
              <ReferenceLine y={0} stroke="rgba(255,255,255,0.1)" />
              <Line
                type="monotone"
                dataKey="agent"
                stroke="#00F0FF"
                strokeWidth={2}
                dot={false}
                name="Agent"
              />
              <Line
                type="monotone"
                dataKey="customer"
                stroke="#FF4DCD"
                strokeWidth={2}
                dot={false}
                name="Customer"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </ExpandableChart>
      
      <div className="flex justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-neon-blue"></div>
          <span className="text-sm text-gray-400">Agent</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-neon-pink"></div>
          <span className="text-sm text-gray-400">Customer</span>
        </div>
      </div>
      
      <h3 className="text-sm font-medium text-white mb-2">Key Moments</h3>
      <div className="space-y-2">
        {sentimentKeyMoments.map((moment, index) => (
          <div 
            key={index} 
            className={`p-2 rounded-lg text-sm flex gap-2 ${
              moment.type === "positive" 
                ? "bg-neon-green/10 border border-neon-green/30" 
                : "bg-neon-red/10 border border-neon-red/30"
            }`}
          >
            <span className={`font-medium ${
              moment.type === "positive" ? "text-neon-green" : "text-neon-red"
            }`}>
              {moment.time}
            </span>
            <span className="text-white">{moment.description}</span>
          </div>
        ))}
      </div>
    </GlowingCard>
  );
};

export default SentimentAnalysis;
