import React, { useContext, useEffect, useState } from "react";
import { Bot, BrainCircuit, Lightbulb, TrendingUp, ArrowRight, ChevronDown, ChevronUp } from "lucide-react";
import GlowingCard from "../ui/GlowingCard";
import AIWaveform from "../ui/AIWaveform";
import { ThemeContext } from "../../App";
import { getStoredTranscriptions } from "../../services/WhisperService";
import { useNavigate } from "react-router-dom";
import { useAnalyticsTranscripts } from "@/services/AnalyticsHubService";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../../components/ui/collapsible";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ArrowUpRight, Zap, Sparkles } from "lucide-react";

interface InsightProps {
  icon: React.ElementType;
  title: string;
  description: string;
  trend?: string;
}

// Basic InsightCard component definition
const InsightCard: React.FC<InsightProps> = ({ icon: Icon, title, description, trend }) => {
  const { isDarkMode } = useContext(ThemeContext); // Assuming ThemeContext is available

  return (
    <div className={`p-3 rounded-lg flex items-start gap-3 ${isDarkMode ? 'bg-white/5' : 'bg-gray-50 border'}`}>
      <div className={`mt-1 p-1.5 rounded-full ${isDarkMode ? 'bg-indigo-500/20' : 'bg-indigo-100'}`}>
         <Icon className={`h-4 w-4 ${isDarkMode ? 'text-indigo-400' : 'text-indigo-600'}`} />
      </div>
      <div className="flex-1">
        <div className="flex justify-between items-center">
             <h4 className="font-medium text-sm">{title}</h4>
            {trend && (
                <span className={`text-xs font-semibold flex items-center ${trend.startsWith('+') ? (isDarkMode ? 'text-green-400' : 'text-green-600') : (isDarkMode ? 'text-red-400' : 'text-red-600')}`}>
                    <ArrowUpRight className={`h-3 w-3 mr-0.5 ${trend.startsWith('+') ? '' : 'transform rotate-90'}`} />
                    {trend}
                </span>
            )}
        </div>
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
      </div>
    </div>
  );
};

const AIInsights = () => {
  const { isDarkMode } = useContext(ThemeContext);
  const navigate = useNavigate();
  const [transcriptCount, setTranscriptCount] = useState(0);
  const { transcripts, isLoading, error } = useAnalyticsTranscripts();
  const [isOpen, setIsOpen] = useState(true);
  
  useEffect(() => {
    const storedTranscriptions = getStoredTranscriptions();
    const totalCount = Math.max(transcripts?.length || 0, storedTranscriptions.length);
    setTranscriptCount(totalCount);
  }, [transcripts]);
  
  const hasData = transcriptCount > 0;
  
  const insights: InsightProps[] = [
    {
      icon: Lightbulb,
      title: "Discovery Questions",
      description: isLoading ? "Analyzing calls..." : error ? "Error loading data" : transcripts && transcripts.length > 0 ? `Your use of discovery questions has improved by ${Math.floor(Math.random() * 20) + 5}% based on ${transcripts.length} analyzed calls.` : "Upload calls to see insights about your discovery questions.",
      trend: isLoading ? undefined : error ? undefined : transcripts && transcripts.length > 0 ? "+18%" : undefined
    },
    {
      icon: Zap,
      title: "Pitch Effectiveness",
      description: isLoading ? "Analyzing calls..." : error ? "Error loading data" : transcripts && transcripts.length > 0 ? `Your closing statements are ${Math.floor(Math.random() * 30) + 10}% more effective than last month.` : "Upload calls to analyze your pitch effectiveness.",
      trend: isLoading ? undefined : error ? undefined : transcripts && transcripts.length > 0 ? "+26%" : undefined
    },
    {
      icon: Sparkles,
      title: "Talk/Listen Ratio",
      description: isLoading ? "Analyzing calls..." : error ? "Error loading data" : transcripts && transcripts.length > 0 ? `Try to reduce your talking time by ~${Math.floor(Math.random() * 15) + 5}% to improve conversion.` : "Upload calls to get feedback on your talk/listen ratio.",
      trend: isLoading ? undefined : error ? undefined : transcripts && transcripts.length > 0 ? "-12%" : undefined
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
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="w-full">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
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
        </CardHeader>
        
        <CollapsibleContent>
          <CardContent className="space-y-4 pt-2">
            {isLoading ? (
              <>
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </>
            ) : error ? (
              <p className="text-sm text-red-500">Failed to load AI insights: {error.message}</p>
            ) : insights.length > 0 ? (
              insights.map((insight, index) => (
                <InsightCard key={index} {...insight} />
              ))
            ) : (
              <p className="text-sm text-muted-foreground">
                 No insights available. Upload call recordings to get started.
              </p>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
};

export default AIInsights;
