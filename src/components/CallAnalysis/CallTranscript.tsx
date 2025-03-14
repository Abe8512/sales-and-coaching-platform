
import React from "react";
import { Copy, Flag, Play, User } from "lucide-react";
import GlowingCard from "../ui/GlowingCard";
import AIWaveform from "../ui/AIWaveform";

interface MessageProps {
  sender: "agent" | "customer";
  content: string;
  timestamp: string;
  flagged?: boolean;
  highlight?: boolean;
}

const Message = ({ sender, content, timestamp, flagged = false, highlight = false }: MessageProps) => {
  return (
    <div className={`py-3 ${highlight ? "bg-white/5 -mx-4 px-4 rounded" : ""}`}>
      <div className="flex gap-3">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center mt-1 ${
          sender === "agent" ? "bg-neon-blue/20" : "bg-neon-pink/20"
        }`}>
          <User className={`h-4 w-4 ${
            sender === "agent" ? "text-neon-blue" : "text-neon-pink"
          }`} />
        </div>
        
        <div className="flex-1">
          <div className="flex justify-between items-center mb-1">
            <h4 className={`text-sm font-medium ${
              sender === "agent" ? "text-neon-blue" : "text-neon-pink"
            }`}>
              {sender === "agent" ? "Sales Agent" : "Customer"}
            </h4>
            <span className="text-xs text-gray-400">{timestamp}</span>
          </div>
          
          <p className="text-white text-sm">
            {content}
            {flagged && (
              <span className="inline-flex items-center ml-2 text-neon-red">
                <Flag className="h-3 w-3 mr-1" />
                <span className="text-xs">Interruption</span>
              </span>
            )}
          </p>
        </div>
      </div>
    </div>
  );
};

const CallTranscript = () => {
  // Mock data for the transcript
  const transcript = [
    {
      id: 1,
      sender: "agent" as const,
      content: "Hello, this is Alex from SalesTech. How are you doing today?",
      timestamp: "00:00:05",
    },
    {
      id: 2,
      sender: "customer" as const,
      content: "I'm fine, but I'm quite busy at the moment.",
      timestamp: "00:00:12",
    },
    {
      id: 3,
      sender: "agent" as const,
      content: "I understand. I won't take much of your time. I'm calling to introduce our new CRM solution that can help streamline your sales process.",
      timestamp: "00:00:18",
    },
    {
      id: 4,
      sender: "customer" as const,
      content: "We actually already have a CRM system that we're using and—",
      timestamp: "00:00:35",
    },
    {
      id: 5,
      sender: "agent" as const,
      content: "Our solution is different because it integrates AI to predict customer behavior and optimize your sales funnel. Would that be valuable to you?",
      timestamp: "00:00:42",
      flagged: true,
      highlight: true,
    },
    {
      id: 6,
      sender: "customer" as const,
      content: "As I was trying to say, we've just signed a 2-year contract with our current provider, so we're not looking to switch at the moment.",
      timestamp: "00:01:05",
    },
    {
      id: 7,
      sender: "agent" as const,
      content: "I understand. Would it be helpful if I sent you some information for when your contract is closer to renewal?",
      timestamp: "00:01:20",
    },
  ];

  return (
    <GlowingCard className="h-full">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-bold text-white">Call Transcript</h2>
          <p className="text-sm text-gray-400">Call with Michael Chen • 11:45 AM • 8m 20s</p>
        </div>
        
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-1 bg-white/5 hover:bg-white/10 text-white px-3 py-1.5 rounded text-sm transition-colors">
            <Play className="h-4 w-4" />
            <span>Play Audio</span>
          </button>
          
          <button className="flex items-center gap-1 bg-white/5 hover:bg-white/10 text-white px-3 py-1.5 rounded text-sm transition-colors">
            <Copy className="h-4 w-4" />
            <span>Copy</span>
          </button>
        </div>
      </div>
      
      <div className="space-y-0 mb-3 max-h-[600px] overflow-y-auto pr-2 divide-y divide-white/5">
        {transcript.map((message) => (
          <Message
            key={message.id}
            sender={message.sender}
            content={message.content}
            timestamp={message.timestamp}
            flagged={message.flagged}
            highlight={message.highlight}
          />
        ))}
      </div>
      
      <div className="pt-4 border-t border-white/10 mt-4">
        <div className="flex items-center gap-3 text-sm text-gray-400">
          <AIWaveform color="blue" barCount={8} className="h-5" />
          <p>AI analyzing transcript patterns...</p>
        </div>
      </div>
    </GlowingCard>
  );
};

export default CallTranscript;
