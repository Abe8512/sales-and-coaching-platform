
import React, { useEffect, useState } from "react";
import { BarChart, Bar, ResponsiveContainer, XAxis, Cell, CartesianGrid, YAxis, Tooltip, Legend } from "recharts";
import { Check, X } from "lucide-react";
import GlowingCard from "../ui/GlowingCard";
import AnimatedNumber from "../ui/AnimatedNumber";
import ExpandableChart from "../ui/ExpandableChart";
import { useChartData } from "@/hooks/useChartData";
import { Button } from "../ui/button";
import { ChartContainer, ChartTooltipContent } from "../ui/chart";
import { StoredTranscription } from "@/services/WhisperService";

interface CallRatingProps {
  transcript?: StoredTranscription | null;
}

const CallRating = ({ transcript }: CallRatingProps) => {
  // Default call score or use the transcript's score
  const [callScore, setCallScore] = useState<number>(76);
  
  // Update score when transcript changes
  useEffect(() => {
    if (transcript && transcript.callScore) {
      setCallScore(transcript.callScore);
    }
  }, [transcript]);

  // Generate metrics based on the transcript
  const generateMetricsFromTranscript = (transcript?: StoredTranscription | null) => {
    if (!transcript) {
      // Default metrics if no transcript is provided
      return [
        { name: "Introduction", score: 90, max: 100 },
        { name: "Discovery", score: 60, max: 100 },
        { name: "Presentation", score: 85, max: 100 },
        { name: "Objection Handling", score: 55, max: 100 },
        { name: "Closing", score: 70, max: 100 },
      ];
    }
    
    // Text-based features analysis (simplified)
    const text = transcript.text.toLowerCase();
    
    // Check for introduction phrases
    const hasGreeting = /hello|hi |hey|good (morning|afternoon|evening)/.test(text);
    const hasIntroduction = /my name is|this is|calling (from|about)|speaking/.test(text);
    const introScore = (hasGreeting ? 45 : 20) + (hasIntroduction ? 45 : 20);
    
    // Check for discovery questions
    const questionCount = (text.match(/\?/g) || []).length;
    const discoveryScore = Math.min(100, Math.max(30, questionCount * 15));
    
    // Check for presentation quality
    const hasFeatures = /feature|benefit|advantage|offer|solution|help|improve|better/.test(text);
    const hasClarification = /mean|clarify|explain|understand|example/.test(text);
    const presentationScore = (hasFeatures ? 40 : 20) + (hasClarification ? 40 : 20);
    
    // Check for objection handling
    const hasObjectionAcknowledgment = /understand|see your point|good question|that's fair|makes sense/.test(text);
    const hasRebuttal = /however|but|actually|in fact|on the other hand|consider/.test(text);
    const objectionScore = (hasObjectionAcknowledgment ? 40 : 15) + (hasRebuttal ? 40 : 20);
    
    // Check for closing
    const hasClosingQuestion = /interested|next steps|schedule|follow up|move forward|decision|purchase|buy|sign up/.test(text);
    const hasSummary = /summarize|to recap|in conclusion|to sum up/.test(text);
    const closingScore = (hasClosingQuestion ? 50 : 25) + (hasSummary ? 30 : 15);
    
    return [
      { name: "Introduction", score: introScore, max: 100 },
      { name: "Discovery", score: discoveryScore, max: 100 },
      { name: "Presentation", score: presentationScore, max: 100 },
      { name: "Objection Handling", score: objectionScore, max: 100 },
      { name: "Closing", score: closingScore, max: 100 },
    ];
  };
  
  const initialCallMetrics = generateMetricsFromTranscript(transcript);
  
  const {
    data: callMetrics,
    isLoading,
    refresh,
    lastUpdated,
    simulateDataUpdate
  } = useChartData(initialCallMetrics);
  
  // Update metrics when transcript changes
  useEffect(() => {
    if (transcript) {
      const newMetrics = generateMetricsFromTranscript(transcript);
      refresh();
    }
  }, [transcript]);
  
  // Generate key behaviors based on metrics and transcript
  const generateKeyBehaviors = (metrics: any[], transcript?: StoredTranscription | null) => {
    const text = transcript ? transcript.text.toLowerCase() : "";
    
    return [
      { behavior: "Used discovery questions", status: metrics[1].score > 60 || /\?/.test(text) },
      { behavior: "Maintained positive tone", status: transcript ? transcript.sentiment !== 'negative' : true },
      { behavior: "Listened actively", status: metrics[1].score > 70 || /i understand|i see|got it/.test(text) },
      { behavior: "Addressed objections", status: metrics[3].score > 60 },
      { behavior: "Used social proof", status: /other customers|clients|people|users have|many/.test(text) },
      { behavior: "Confirmed next steps", status: metrics[4].score > 70 || /next steps|follow up|schedule/.test(text) },
    ];
  };
  
  const keyBehaviors = generateKeyBehaviors(callMetrics, transcript);

  const getScoreColor = (score: number) => {
    if (score >= 80) return "#06D6A0";
    if (score >= 60) return "#00F0FF";
    return "#FF5470";
  };

  // Expanded chart content
  const expandedCallRatingChart = (
    <div className="space-y-4">
      <div className="flex justify-between">
        <div>
          <h3 className="text-lg font-bold">Detailed Call Rating</h3>
          <p className="text-sm text-muted-foreground">Comprehensive analysis of call performance metrics</p>
        </div>
        <Button onClick={simulateDataUpdate}>Refresh Analysis</Button>
      </div>
      
      <div className="h-[400px]">
        <ChartContainer
          config={{
            score: {
              label: "Score",
              theme: {
                light: "#00F0FF",
                dark: "#00F0FF",
              },
            },
          }}
        >
          <BarChart 
            data={callMetrics} 
            margin={{ top: 20, right: 30, left: 20, bottom: 30 }}
            layout="vertical"
          >
            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
            <XAxis type="number" domain={[0, 100]} />
            <YAxis dataKey="name" type="category" width={150} />
            <Tooltip content={<ChartTooltipContent />} />
            <Legend />
            <Bar
              name="Score"
              dataKey="score"
              fill="var(--color-score)"
              background={{ fill: "rgba(255, 255, 255, 0.1)" }}
              radius={[0, 4, 4, 0]}
            >
              {callMetrics.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getScoreColor(entry.score)} />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>
      </div>
      
      <div className="grid grid-cols-2 gap-6">
        <div>
          <h4 className="font-medium mb-3">Key Behaviors</h4>
          <div className="grid grid-cols-1 gap-3">
            {keyBehaviors.map((item, index) => (
              <div key={index} className={`p-3 flex items-center gap-3 border rounded-lg ${
                item.status ? "border-neon-green/30 bg-neon-green/5" : "border-neon-red/30 bg-neon-red/5"
              }`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  item.status ? "bg-neon-green/20" : "bg-neon-red/20"
                }`}>
                  {item.status ? (
                    <Check className="h-5 w-5 text-neon-green" />
                  ) : (
                    <X className="h-5 w-5 text-neon-red" />
                  )}
                </div>
                <span className="text-md">{item.behavior}</span>
              </div>
            ))}
          </div>
        </div>
        
        <div>
          <h4 className="font-medium mb-3">Improvement Areas</h4>
          <div className="p-5 border rounded-lg h-full">
            <ul className="space-y-4">
              {!keyBehaviors[2].status && (
                <li className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-neon-red mt-2"></div>
                  <div>
                    <h5 className="font-medium text-neon-red mb-1">Active Listening</h5>
                    <p className="text-sm text-muted-foreground">Work on active listening skills and avoid interrupting customers. Let them complete their thoughts before responding.</p>
                  </div>
                </li>
              )}
              {!keyBehaviors[3].status && (
                <li className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-neon-red mt-2"></div>
                  <div>
                    <h5 className="font-medium text-neon-red mb-1">Objection Handling</h5>
                    <p className="text-sm text-muted-foreground">Improve objection handling by acknowledging customer concerns and addressing them directly with specific solutions.</p>
                  </div>
                </li>
              )}
              {!keyBehaviors[5].status && (
                <li className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-amber-500 mt-2"></div>
                  <div>
                    <h5 className="font-medium text-amber-500 mb-1">Closing Techniques</h5>
                    <p className="text-sm text-muted-foreground">Work on stronger closing techniques to improve conversion rates. Be more direct with calls to action.</p>
                  </div>
                </li>
              )}
              {keyBehaviors.every(b => b.status) && (
                <li className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-green-500 mt-2"></div>
                  <div>
                    <h5 className="font-medium text-green-500 mb-1">Great Work!</h5>
                    <p className="text-sm text-muted-foreground">This call demonstrates excellent sales techniques. Keep up the good work and maintain consistency in your approach.</p>
                  </div>
                </li>
              )}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <GlowingCard gradient="purple" className="h-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-white">Call Rating</h2>
        
        <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-white/10">
          <span className="text-sm font-medium" style={{ color: getScoreColor(callScore) }}>
            <AnimatedNumber value={callScore} suffix="/100" />
          </span>
        </div>
      </div>
      
      <ExpandableChart 
        title="Performance by Category" 
        expandedContent={expandedCallRatingChart}
        isLoading={isLoading}
        onRefresh={refresh}
        lastUpdated={lastUpdated}
        className="mb-4"
      >
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={callMetrics}
              layout="vertical"
              margin={{ top: 0, right: 0, left: 80, bottom: 0 }}
            >
              <XAxis type="number" domain={[0, 100]} hide />
              <Bar
                dataKey="score"
                background={{ fill: "rgba(255, 255, 255, 0.1)" }}
                radius={[0, 4, 4, 0]}
              >
                {callMetrics.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={getScoreColor(entry.score)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ExpandableChart>
      
      <h3 className="text-sm font-medium text-white mb-2">Key Behaviors</h3>
      <div className="grid grid-cols-2 gap-2">
        {keyBehaviors.map((item, index) => (
          <div key={index} className="flex items-center gap-2">
            <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
              item.status ? "bg-neon-green/20" : "bg-neon-red/20"
            }`}>
              {item.status ? (
                <Check className="h-3 w-3 text-neon-green" />
              ) : (
                <X className="h-3 w-3 text-neon-red" />
              )}
            </div>
            <span className="text-sm text-white">{item.behavior}</span>
          </div>
        ))}
      </div>
      
      <div className="mt-6 p-3 rounded-lg bg-white/5">
        <h3 className="text-sm font-medium text-white mb-2">Improvement Areas</h3>
        <ul className="space-y-1">
          {!keyBehaviors[2].status && (
            <li className="text-sm text-gray-400 flex items-start gap-2">
              <div className="w-1 h-1 rounded-full bg-neon-red mt-2"></div>
              <span>Work on active listening skills and avoid interrupting customers</span>
            </li>
          )}
          {!keyBehaviors[3].status && (
            <li className="text-sm text-gray-400 flex items-start gap-2">
              <div className="w-1 h-1 rounded-full bg-neon-red mt-2"></div>
              <span>Improve objection handling by acknowledging customer concerns</span>
            </li>
          )}
          {!keyBehaviors[5].status && (
            <li className="text-sm text-gray-400 flex items-start gap-2">
              <div className="w-1 h-1 rounded-full bg-amber-500 mt-2"></div>
              <span>Work on stronger closing techniques to improve conversion rates</span>
            </li>
          )}
          {keyBehaviors.every(b => b.status) && (
            <li className="text-sm text-gray-400 flex items-start gap-2">
              <div className="w-1 h-1 rounded-full bg-green-500 mt-2"></div>
              <span>Great work! Keep up the consistent performance</span>
            </li>
          )}
        </ul>
      </div>
    </GlowingCard>
  );
};

export default CallRating;
