
import React from "react";
import { MoreHorizontal, Flag, Clock, Phone, User, CalendarClock } from "lucide-react";
import GlowingCard from "../ui/GlowingCard";
import AIWaveform from "../ui/AIWaveform";

interface CallItemProps {
  customer: string;
  time: string;
  duration: string;
  score: number;
  flagged?: boolean;
}

const CallItem = ({ customer, time, duration, score, flagged = false }: CallItemProps) => {
  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-neon-green";
    if (score >= 60) return "text-yellow-400";
    return "text-neon-red";
  };

  return (
    <div className="flex items-center justify-between p-3 border-b border-white/5 hover:bg-white/5 rounded-md cursor-pointer transition-colors">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-dark-purple flex items-center justify-center">
          <User className="h-4 w-4 text-gray-400" />
        </div>
        <div>
          <p className="text-sm font-medium text-white">{customer}</p>
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <Clock className="h-3 w-3" />
            <span>{time}</span>
            <span>•</span>
            <span>{duration}</span>
          </div>
        </div>
      </div>
      
      <div className="flex items-center gap-4">
        {flagged && (
          <Flag className="h-4 w-4 text-neon-red" />
        )}
        
        <div>
          <p className="text-xs text-gray-400 text-right">Score</p>
          <p className={`text-sm font-medium ${getScoreColor(score)}`}>{score}</p>
        </div>
        
        <AIWaveform 
          barCount={4} 
          color={score >= 80 ? "green" : score >= 60 ? "blue" : "red"} 
          className="h-5" 
        />
        
        <button className="text-gray-400 hover:text-white">
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

const CallsOverview = () => {
  // Mock data
  const recentCalls = [
    { id: 1, customer: "Sarah Johnson", time: "10:30 AM", duration: "12m 45s", score: 92 },
    { id: 2, customer: "Michael Chen", time: "11:45 AM", duration: "8m 20s", score: 76 },
    { id: 3, customer: "Emily Rodriguez", time: "1:15 PM", duration: "15m 10s", score: 45, flagged: true },
    { id: 4, customer: "David Kim", time: "2:30 PM", duration: "6m 55s", score: 88 },
    { id: 5, customer: "Jessica Wong", time: "3:45 PM", duration: "11m 32s", score: 62 },
  ];

  return (
    <GlowingCard className="mt-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-white">Recent Calls</h2>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-lg text-sm">
            <CalendarClock className="h-4 w-4 text-neon-purple" />
            <span className="text-white font-medium">Today</span>
          </div>
          
          <button className="bg-neon-purple/20 hover:bg-neon-purple/30 text-neon-purple px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1">
            <Phone className="h-4 w-4" />
            <span>All Calls</span>
          </button>
        </div>
      </div>
      
      <div className="space-y-1">
        {recentCalls.map((call) => (
          <CallItem
            key={call.id}
            customer={call.customer}
            time={call.time}
            duration={call.duration}
            score={call.score}
            flagged={call.flagged}
          />
        ))}
      </div>
    </GlowingCard>
  );
};

export default CallsOverview;
