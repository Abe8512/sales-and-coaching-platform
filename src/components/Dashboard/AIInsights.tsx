
import React from "react";
import { Bot, BrainCircuit, Lightbulb, TrendingUp, ArrowRight } from "lucide-react";
import GlowingCard from "../ui/GlowingCard";
import AIWaveform from "../ui/AIWaveform";

const AIInsights = () => {
  // Mock data for AI insights
  const insights = [
    {
      id: 1,
      title: "Discovery Questions",
      description: "Your use of discovery questions has improved by 18% this week.",
      icon: <Lightbulb className="h-5 w-5 text-neon-blue" />,
      gradient: "blue"
    },
    {
      id: 2,
      title: "Pitch Effectiveness",
      description: "Your closing statements are 26% more effective than last month.",
      icon: <TrendingUp className="h-5 w-5 text-neon-purple" />,
      gradient: "purple"
    },
    {
      id: 3,
      title: "Talk/Listen Ratio",
      description: "Try to reduce your talking time by ~12% to improve conversion.",
      icon: <BrainCircuit className="h-5 w-5 text-neon-pink" />,
      gradient: "pink"
    }
  ];

  return (
    <div className="mt-6">
      <GlowingCard gradient="purple">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-neon-purple" />
            <h2 className="text-xl font-bold text-white">AI Insights</h2>
          </div>
          
          <button className="text-neon-purple hover:text-neon-purple/80 text-sm font-medium transition-colors flex items-center gap-1">
            <span>View All Insights</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
        
        <div className="flex items-center gap-3 mb-6">
          <AIWaveform color="purple" barCount={15} />
          <p className="text-sm text-gray-400">
            AI analyzing <span className="text-neon-purple font-medium">173 calls</span> from last 7 days
          </p>
        </div>
        
        <div className="space-y-4">
          {insights.map((insight) => (
            <div key={insight.id} className={`p-3 rounded-lg neon-${insight.gradient}-border bg-white/5`}>
              <div className="flex gap-3">
                <div className="mt-1">{insight.icon}</div>
                <div>
                  <h3 className="text-white font-medium mb-1">{insight.title}</h3>
                  <p className="text-sm text-gray-400">{insight.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-6 p-4 rounded-lg bg-dark-purple/50 border border-white/10">
          <div className="flex items-start gap-3">
            <div className="bg-neon-purple/20 rounded-full p-2 mt-1">
              <Bot className="h-5 w-5 text-neon-purple" />
            </div>
            <div>
              <p className="text-sm text-white mb-2">
                <span className="font-medium">Suggestion:</span> Based on your recent calls, try acknowledging customer concerns before presenting solutions. This approach has shown a 32% higher success rate among top performers.
              </p>
              <div className="mt-2 flex items-center gap-2">
                <button className="bg-neon-purple hover:bg-neon-purple/90 text-white px-3 py-1.5 rounded text-xs font-medium transition-colors">
                  Apply to Script
                </button>
                <button className="bg-white/10 hover:bg-white/15 text-white px-3 py-1.5 rounded text-xs font-medium transition-colors">
                  Show Examples
                </button>
              </div>
            </div>
          </div>
        </div>
      </GlowingCard>
    </div>
  );
};

export default AIInsights;
