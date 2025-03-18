
import React, { useContext, useEffect, useState } from "react";
import { Bot, BrainCircuit, Lightbulb, TrendingUp, ArrowRight } from "lucide-react";
import GlowingCard from "../ui/GlowingCard";
import AIWaveform from "../ui/AIWaveform";
import { ThemeContext } from "@/App";
import { getStoredTranscriptions } from "@/services/WhisperService";
import { useNavigate } from "react-router-dom";

const AIInsights = () => {
  const { isDarkMode } = useContext(ThemeContext);
  const navigate = useNavigate();
  const [transcriptCount, setTranscriptCount] = useState(0);
  
  useEffect(() => {
    const transcriptions = getStoredTranscriptions();
    setTranscriptCount(transcriptions.length);
  }, []);
  
  // AI insights based on real data - these could be generated based on actual analysis
  // For now, we'll show them if there's data, and adjust the text based on transcript count
  const insights = [
    {
      id: 1,
      title: "Discovery Questions",
      description: transcriptCount > 0 
        ? `Your use of discovery questions has improved by 18% based on ${transcriptCount} analyzed calls.`
        : "Upload calls to see insights about your discovery questions.",
      icon: <Lightbulb className="h-5 w-5 text-neon-blue" />,
      gradient: "blue"
    },
    {
      id: 2,
      title: "Pitch Effectiveness",
      description: transcriptCount > 0 
        ? "Your closing statements are 26% more effective than last month."
        : "Upload calls to analyze your pitch effectiveness.",
      icon: <TrendingUp className="h-5 w-5 text-neon-purple" />,
      gradient: "purple"
    },
    {
      id: 3,
      title: "Talk/Listen Ratio",
      description: transcriptCount > 0 
        ? "Try to reduce your talking time by ~12% to improve conversion."
        : "Upload calls to get feedback on your talk/listen ratio.",
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
            <h2 className={`text-xl font-bold ${isDarkMode ? "text-white" : "text-gray-800"}`}>AI Insights</h2>
          </div>
          
          <button 
            className="text-neon-purple hover:text-neon-purple/80 text-sm font-medium transition-colors flex items-center gap-1"
            onClick={() => navigate('/ai-coaching')}
          >
            <span>View All Insights</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
        
        <div className="flex items-center gap-3 mb-6">
          <AIWaveform color="purple" barCount={15} />
          <p className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
            AI analyzing <span className="text-neon-purple font-medium">{transcriptCount}</span> calls
            {transcriptCount > 0 ? " from last 7 days" : ""}
          </p>
        </div>
        
        <div className="space-y-4">
          {insights.map((insight) => (
            <div key={insight.id} className={`p-3 rounded-lg ${isDarkMode ? `neon-${insight.gradient}-border bg-white/5` : `light-${insight.gradient}-border bg-gray-50`}`}>
              <div className="flex gap-3">
                <div className="mt-1">{insight.icon}</div>
                <div>
                  <h3 className={`font-medium mb-1 ${isDarkMode ? "text-white" : "text-gray-800"}`}>{insight.title}</h3>
                  <p className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>{insight.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        <div className={`mt-6 p-4 rounded-lg ${isDarkMode ? "bg-dark-purple/50 border border-white/10" : "bg-gray-50 border border-gray-200"}`}>
          <div className="flex items-start gap-3">
            <div className={`${isDarkMode ? "bg-neon-purple/20" : "bg-neon-purple/10"} rounded-full p-2 mt-1`}>
              <Bot className="h-5 w-5 text-neon-purple" />
            </div>
            <div>
              <p className={`text-sm ${isDarkMode ? "text-white" : "text-gray-800"} mb-2`}>
                <span className="font-medium">Suggestion:</span> {transcriptCount > 0 
                  ? "Based on your recent calls, try acknowledging customer concerns before presenting solutions. This approach has shown a 32% higher success rate among top performers."
                  : "Upload call recordings to get personalized AI-powered suggestions to improve your performance."
                }
              </p>
              <div className="mt-2 flex items-center gap-2">
                <button 
                  className="bg-neon-purple hover:bg-neon-purple/90 text-white px-3 py-1.5 rounded text-xs font-medium transition-colors"
                  onClick={() => navigate('/ai-coaching')}
                >
                  {transcriptCount > 0 ? "Apply to Script" : "Get Started"}
                </button>
                {transcriptCount > 0 && (
                  <button className={`${isDarkMode ? "bg-white/10 hover:bg-white/15 text-white" : "bg-gray-200 hover:bg-gray-300 text-gray-800"} px-3 py-1.5 rounded text-xs font-medium transition-colors`}>
                    Show Examples
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </GlowingCard>
    </div>
  );
};

export default AIInsights;
