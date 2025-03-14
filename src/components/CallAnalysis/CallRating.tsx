
import React from "react";
import { BarChart, Bar, ResponsiveContainer, XAxis, Cell } from "recharts";
import { Check, X } from "lucide-react";
import GlowingCard from "../ui/GlowingCard";
import AnimatedNumber from "../ui/AnimatedNumber";

const CallRating = () => {
  // Mock data for call metrics
  const callScore = 76;
  
  const callMetrics = [
    { name: "Introduction", score: 90, max: 100 },
    { name: "Discovery", score: 60, max: 100 },
    { name: "Presentation", score: 85, max: 100 },
    { name: "Objection Handling", score: 55, max: 100 },
    { name: "Closing", score: 70, max: 100 },
  ];
  
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
      
      <div className="h-40 mb-4">
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
