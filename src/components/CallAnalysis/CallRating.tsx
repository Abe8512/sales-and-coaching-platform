
import React from "react";
import { BarChart, Bar, ResponsiveContainer, XAxis, Cell, CartesianGrid, YAxis, Tooltip, Legend } from "recharts";
import { Check, X } from "lucide-react";
import GlowingCard from "../ui/GlowingCard";
import AnimatedNumber from "../ui/AnimatedNumber";
import ExpandableChart from "../ui/ExpandableChart";
import { useChartData } from "@/hooks/useChartData";
import { Button } from "../ui/button";
import { ChartContainer, ChartTooltipContent } from "../ui/chart";

const CallRating = () => {
  // Mock data for call metrics
  const callScore = 76;
  
  const initialCallMetrics = [
    { name: "Introduction", score: 90, max: 100 },
    { name: "Discovery", score: 60, max: 100 },
    { name: "Presentation", score: 85, max: 100 },
    { name: "Objection Handling", score: 55, max: 100 },
    { name: "Closing", score: 70, max: 100 },
  ];
  
  const {
    data: callMetrics,
    isLoading,
    refresh,
    lastUpdated,
    simulateDataUpdate
  } = useChartData(initialCallMetrics);
  
  const keyBehaviors = [
    { behavior: "Used discovery questions", status: true },
    { behavior: "Maintained positive tone", status: true },
    { behavior: "Listened actively", status: false },
    { behavior: "Addressed objections", status: false },
    { behavior: "Used social proof", status: true },
    { behavior: "Confirmed next steps", status: true },
  ];

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
        <Button onClick={simulateDataUpdate}>Simulate Update</Button>
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
              <li className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-neon-red mt-2"></div>
                <div>
                  <h5 className="font-medium text-neon-red mb-1">Active Listening</h5>
                  <p className="text-sm text-muted-foreground">Work on active listening skills and avoid interrupting customers. Let them complete their thoughts before responding.</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-neon-red mt-2"></div>
                <div>
                  <h5 className="font-medium text-neon-red mb-1">Objection Handling</h5>
                  <p className="text-sm text-muted-foreground">Improve objection handling by acknowledging customer concerns and addressing them directly with specific solutions.</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-amber-500 mt-2"></div>
                <div>
                  <h5 className="font-medium text-amber-500 mb-1">Closing Techniques</h5>
                  <p className="text-sm text-muted-foreground">Work on stronger closing techniques to improve conversion rates. Be more direct with calls to action.</p>
                </div>
              </li>
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
        onRefresh={simulateDataUpdate}
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
          <li className="text-sm text-gray-400 flex items-start gap-2">
            <div className="w-1 h-1 rounded-full bg-neon-red mt-2"></div>
            <span>Work on active listening skills and avoid interrupting customers</span>
          </li>
          <li className="text-sm text-gray-400 flex items-start gap-2">
            <div className="w-1 h-1 rounded-full bg-neon-red mt-2"></div>
            <span>Improve objection handling by acknowledging customer concerns</span>
          </li>
        </ul>
      </div>
    </GlowingCard>
  );
};

export default CallRating;
