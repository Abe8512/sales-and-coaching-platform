
import React, { useContext, useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Activity, Clock, MessageSquare, TrendingUp, Volume2 } from "lucide-react";
import { ThemeContext } from "@/App";
import AnimatedNumber from "../ui/AnimatedNumber";
import AIWaveform from "../ui/AIWaveform";
import GlowingCard from "../ui/GlowingCard";

interface LiveMetricsDisplayProps {
  isCallActive: boolean;
  duration: number;
  talkRatio?: { agent: number; customer: number };
  sentiment?: { agent: number; customer: number };
  keyPhrases?: string[];
}

const LiveMetricsDisplay = ({
  isCallActive,
  duration,
  talkRatio = { agent: 50, customer: 50 },
  sentiment = { agent: 0.7, customer: 0.5 },
  keyPhrases = [],
}: LiveMetricsDisplayProps) => {
  const { isDarkMode } = useContext(ThemeContext);
  const [localSentiment, setLocalSentiment] = useState(sentiment);
  const [localTalkRatio, setLocalTalkRatio] = useState(talkRatio);
  
  // Simulate changing values slightly for the demo
  useEffect(() => {
    if (isCallActive) {
      const interval = setInterval(() => {
        setLocalSentiment({
          agent: Math.max(0, Math.min(1, sentiment.agent + (Math.random() * 0.1 - 0.05))),
          customer: Math.max(0, Math.min(1, sentiment.customer + (Math.random() * 0.1 - 0.05))),
        });
        
        // Gradually shift talk ratio
        const agentShift = Math.random() * 2 - 1;
        setLocalTalkRatio({
          agent: Math.max(20, Math.min(80, localTalkRatio.agent + agentShift)),
          customer: Math.max(20, Math.min(80, localTalkRatio.customer - agentShift)),
        });
      }, 2000);
      
      return () => clearInterval(interval);
    }
  }, [isCallActive, sentiment]);
  
  // Format duration into minutes:seconds
  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };
  
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Call Duration */}
        <Card className={`${isDarkMode ? "border-neon-blue/20 bg-black/20" : "border-blue-100 bg-blue-50"}`}>
          <CardContent className="p-4">
            <div className="flex justify-between items-center">
              <div>
                <p className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>Call Duration</p>
                <div className="text-2xl font-bold mt-1 flex items-center">
                  <Clock className={`h-5 w-5 mr-2 ${isDarkMode ? "text-neon-blue" : "text-blue-500"}`} />
                  <AnimatedNumber 
                    value={duration} 
                    formatter={formatDuration}
                  />
                </div>
              </div>
              {isCallActive && <AIWaveform color="blue" barCount={3} className="h-6" />}
            </div>
          </CardContent>
        </Card>
        
        {/* Talk Ratio */}
        <Card className={`${isDarkMode ? "border-purple-500/20 bg-black/20" : "border-purple-100 bg-purple-50"}`}>
          <CardContent className="p-4">
            <div className="space-y-2">
              <p className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>Talk Ratio</p>
              <div className="flex items-center gap-2">
                <span className={`text-xs ${isDarkMode ? "text-neon-blue" : "text-blue-500"}`}>Agent</span>
                <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-neon-blue rounded-full" 
                    style={{ width: `${localTalkRatio.agent}%` }}
                  ></div>
                </div>
                <span className="text-xs font-semibold w-8 text-end">
                  {Math.round(localTalkRatio.agent)}%
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs ${isDarkMode ? "text-neon-pink" : "text-pink-500"}`}>Customer</span>
                <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-neon-pink rounded-full" 
                    style={{ width: `${localTalkRatio.customer}%` }}
                  ></div>
                </div>
                <span className="text-xs font-semibold w-8 text-end">
                  {Math.round(localTalkRatio.customer)}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Live Sentiment */}
        <Card className={`${isDarkMode ? "border-green-500/20 bg-black/20" : "border-green-100 bg-green-50"}`}>
          <CardContent className="p-4">
            <div className="space-y-2">
              <p className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>Live Sentiment</p>
              <div className="flex items-center gap-2">
                <span className={`text-xs ${isDarkMode ? "text-neon-blue" : "text-blue-500"}`}>Agent</span>
                <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div 
                    className={`h-full ${localSentiment.agent > 0.7 ? "bg-green-500" : localSentiment.agent > 0.4 ? "bg-yellow-500" : "bg-red-500"} rounded-full`}
                    style={{ width: `${localSentiment.agent * 100}%` }}
                  ></div>
                </div>
                <span className="text-xs font-semibold w-8 text-end">
                  {Math.round(localSentiment.agent * 100)}%
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs ${isDarkMode ? "text-neon-pink" : "text-pink-500"}`}>Customer</span>
                <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div 
                    className={`h-full ${localSentiment.customer > 0.7 ? "bg-green-500" : localSentiment.customer > 0.4 ? "bg-yellow-500" : "bg-red-500"} rounded-full`}
                    style={{ width: `${localSentiment.customer * 100}%` }}
                  ></div>
                </div>
                <span className="text-xs font-semibold w-8 text-end">
                  {Math.round(localSentiment.customer * 100)}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Speech Pace */}
        <Card className={`${isDarkMode ? "border-amber-500/20 bg-black/20" : "border-amber-100 bg-amber-50"}`}>
          <CardContent className="p-4">
            <div className="flex justify-between items-center">
              <div>
                <p className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>Speech Pace</p>
                <div className="text-2xl font-bold mt-1 flex items-center">
                  <Volume2 className={`h-5 w-5 mr-2 ${isDarkMode ? "text-amber-400" : "text-amber-500"}`} />
                  <AnimatedNumber 
                    value={isCallActive ? 140 + Math.random() * 30 : 0} 
                    formatter={(val) => val.toFixed(0)}
                    suffix=" wpm"
                  />
                </div>
              </div>
              {isCallActive && <Activity className={`h-6 w-6 ${isDarkMode ? "text-amber-400" : "text-amber-500"}`} />}
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Key Phrases and Stats */}
      {isCallActive && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <GlowingCard gradient="purple" className="col-span-1 md:col-span-2">
            <h3 className="text-white text-lg font-semibold mb-2">Real-time Keywords</h3>
            <div className="flex flex-wrap gap-2 mt-3">
              {keyPhrases.map((phrase, index) => (
                <span 
                  key={index} 
                  className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-white/10 text-white"
                >
                  {phrase}
                </span>
              ))}
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-neon-blue/30 text-white">
                pricing
              </span>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-neon-pink/30 text-white">
                feature request
              </span>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-neon-green/30 text-white">
                integration
              </span>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-neon-purple/30 text-white">
                timeline
              </span>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-amber-500/30 text-white">
                competitors
              </span>
            </div>
            <div className="flex items-center gap-3 text-sm text-gray-400 mt-4">
              <AIWaveform color="pink" barCount={8} className="h-5" />
              <p>AI analyzing speech patterns...</p>
            </div>
          </GlowingCard>
          
          <Card className={`${isDarkMode ? "border-white/10 bg-black/20" : "border-gray-200 bg-gray-50"}`}>
            <CardContent className="p-4">
              <div className="space-y-3">
                <h3 className={`text-lg font-semibold ${isDarkMode ? "text-white" : "text-gray-800"}`}>Call Analytics</h3>
                
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
                      <MessageSquare className="h-4 w-4 inline mr-1" /> Questions Asked
                    </span>
                    <span className="font-medium">
                      <AnimatedNumber value={7} />
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
                      <TrendingUp className="h-4 w-4 inline mr-1" /> Engagement Score
                    </span>
                    <span className="font-medium">
                      <AnimatedNumber value={82} suffix="%" />
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
                      <Activity className="h-4 w-4 inline mr-1" /> Energy Level
                    </span>
                    <span className="font-medium">
                      <AnimatedNumber value={76} suffix="%" />
                    </span>
                  </div>
                </div>
                
                <div className={`mt-3 p-2 rounded text-sm ${isDarkMode ? "bg-neon-green/10 text-neon-green" : "bg-green-100 text-green-700"}`}>
                  <strong>AI Analysis:</strong> High engagement, positive trends detected
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default LiveMetricsDisplay;
