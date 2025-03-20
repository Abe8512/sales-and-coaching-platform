import React, { useContext, useEffect, useState } from "react";
import { Bot, BrainCircuit, Lightbulb, TrendingUp, ArrowRight, ChevronDown, ChevronUp } from "lucide-react";
import GlowingCard from "../ui/GlowingCard";
import AIWaveform from "../ui/AIWaveform";
import { ThemeContext } from "@/App";
import { getStoredTranscriptions } from "@/services/WhisperService";
import { useNavigate } from "react-router-dom";
import { useCallTranscripts } from "@/services/CallTranscriptService";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

const AIInsights = () => {
  const { isDarkMode } = useContext(ThemeContext);
  const navigate = useNavigate();
  const [transcriptCount, setTranscriptCount] = useState(0);
  const { transcripts } = useCallTranscripts();
  const [isOpen, setIsOpen] = useState(true);
  
  useEffect(() => {
    const storedTranscriptions = getStoredTranscriptions();
    const totalCount = Math.max(transcripts?.length || 0, storedTranscriptions.length);
    setTranscriptCount(totalCount);
  }, [transcripts]);
  
  const hasData = transcriptCount > 0;
  
  const insights = [
    {
      id: 1,
      title: "Discovery Questions",
      description: hasData 
        ? `Your use of discovery questions has improved by 18% based on ${transcriptCount} analyzed calls.`
        : "Upload calls to see insights about your discovery questions.",
      icon: <Lightbulb className="h-5 w-5 text-neon-blue" />,
      gradient: "blue"
    },
    {
      id: 2,
      title: "Pitch Effectiveness",
      description: hasData 
        ? "Your closing statements are 26% more effective than last month."
        : "Upload calls to analyze your pitch effectiveness.",
      icon: <TrendingUp className="h-5 w-5 text-neon-purple" />,
      gradient: "purple"
    },
    {
      id: 3,
      title: "Talk/Listen Ratio",
      description: hasData 
        ? "Try to reduce your talking time by ~12% to improve conversion."
        : "Upload calls to get feedback on your talk/listen ratio.",
      icon: <BrainCircuit className="h-5 w-5 text-neon-pink" />,
      gradient: "pink"
    }
  ];

  const getSuggestion = () => {
    if (!hasData) {
      return "Upload call recordings to get personalized AI-powered suggestions to improve your performance.";
    }
    
    const suggestions = [
      "Based on your recent calls, try acknowledging customer concerns before presenting solutions. This approach has shown a 32% higher success rate among top performers.",
      "Your strongest calls consistently feature more open-ended questions. Try increasing question frequency by 25% in your next calls.",
      "Success rate improves by 40% when you spend the first 3 minutes building rapport before discussing product details."
    ];
    
    return suggestions[transcriptCount % suggestions.length];
  };

  return (
    <GlowingCard gradient="purple" className="h-full mt-6">
      <Collapsible open={isOpen} onOpenChange={setIsOpen} className="w-full">
        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-neon-purple" />
            <h2 className={`text-xl font-bold ${isDarkMode ? "text-white" : "text-gray-800"}`}>AI Insights</h2>
          </div>
          
          <div className="flex items-center gap-2">
            <button 
              className="text-neon-purple hover:text-neon-purple/80 text-sm font-medium transition-colors flex items-center gap-1"
              onClick={() => navigate('/ai-coaching')}
            >
              <span>View All</span>
              <ArrowRight className="h-4 w-4" />
            </button>
            
            <CollapsibleTrigger asChild>
              <button className={`${isDarkMode ? "text-gray-400 hover:text-white" : "text-gray-500 hover:text-gray-800"} rounded-full p-1 transition-colors`}>
                {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
            </CollapsibleTrigger>
          </div>
        </div>
        
        <CollapsibleContent>
          <div className="flex items-center gap-3 mb-4">
            <AIWaveform color="purple" barCount={15} />
            <p className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
              {hasData 
                ? `AI analyzing ${transcriptCount} calls from last 7 days` 
                : "No calls analyzed yet. Upload calls to get insights."
              }
            </p>
          </div>
          
          <div className="space-y-3">
            {insights.map((insight) => (
              <div key={insight.id} className={`p-2.5 rounded-lg ${isDarkMode ? `neon-${insight.gradient}-border bg-white/5` : `light-${insight.gradient}-border bg-gray-50`}`}>
                <div className="flex gap-3">
                  <div className="mt-1">{insight.icon}</div>
                  <div>
                    <h3 className={`font-medium mb-1 ${isDarkMode ? "text-white" : "text-gray-800"}`}>{insight.title}</h3>
                    <p className={`text-xs ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>{insight.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          <div className={`mt-4 p-3 rounded-lg ${isDarkMode ? "bg-dark-purple/50 border border-white/10" : "bg-gray-50 border border-gray-200"}`}>
            <div className="flex items-start gap-3">
              <div className={`${isDarkMode ? "bg-neon-purple/20" : "bg-neon-purple/10"} rounded-full p-2 mt-1`}>
                <Bot className="h-5 w-5 text-neon-purple" />
              </div>
              <div>
                <p className={`text-xs ${isDarkMode ? "text-white" : "text-gray-800"} mb-2`}>
                  <span className="font-medium">Suggestion:</span> {getSuggestion()}
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <button 
                    className="bg-neon-purple hover:bg-neon-purple/90 text-white px-3 py-1.5 rounded text-xs font-medium transition-colors"
                    onClick={() => navigate('/ai-coaching')}
                  >
                    {hasData ? "Apply to Script" : "Get Started"}
                  </button>
                  {hasData && (
                    <button className={`${isDarkMode ? "bg-white/10 hover:bg-white/15 text-white" : "bg-gray-200 hover:bg-gray-300 text-gray-800"} px-3 py-1.5 rounded text-xs font-medium transition-colors`}>
                      Show Examples
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </GlowingCard>
  );
};

export default AIInsights;
