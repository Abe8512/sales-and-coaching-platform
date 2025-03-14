
import React from "react";
import { LineChart, Line, ResponsiveContainer, ReferenceLine } from "recharts";
import { Info } from "lucide-react";
import GlowingCard from "../ui/GlowingCard";

const SentimentAnalysis = () => {
  // Mock data for sentiment analysis
  const sentimentData = [
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

  return (
    <GlowingCard gradient="blue" className="h-full">
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-xl font-bold text-white">Sentiment Analysis</h2>
        <button className="text-gray-400 hover:text-white">
          <Info className="h-5 w-5" />
        </button>
      </div>
      
      <div className="h-60 mb-4">
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
