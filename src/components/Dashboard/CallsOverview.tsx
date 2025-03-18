
import React, { useContext, useEffect, useState } from "react";
import { MoreHorizontal, Flag, Clock, Phone, User, CalendarClock } from "lucide-react";
import GlowingCard from "../ui/GlowingCard";
import AIWaveform from "../ui/AIWaveform";
import { ThemeContext } from "@/App";
import WhisperButton from "../Whisper/WhisperButton";
import { getStoredTranscriptions, StoredTranscription } from "@/services/WhisperService";
import { format, parseISO } from "date-fns";
import { useNavigate } from "react-router-dom";

interface CallItemProps {
  id: string;
  customer: string;
  time: string;
  duration: string;
  score: number;
  flagged?: boolean;
  isDarkMode: boolean;
  onClick: () => void;
}

const CallItem = ({ id, customer, time, duration, score, flagged = false, isDarkMode, onClick }: CallItemProps) => {
  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-neon-green";
    if (score >= 60) return "text-yellow-400";
    return "text-neon-red";
  };

  return (
    <div 
      className={`flex items-center justify-between p-3 border-b ${isDarkMode ? "border-gray-100/10" : "border-gray-100"} ${isDarkMode ? "hover:bg-white/5" : "hover:bg-gray-50"} rounded-md cursor-pointer transition-colors`}
      onClick={onClick}
    >
      <div className="flex items-center gap-3">
        <div className={`w-8 h-8 rounded-full ${isDarkMode ? "bg-gray-800" : "bg-gray-100"} flex items-center justify-center`}>
          <User className={`h-4 w-4 ${isDarkMode ? "text-gray-400" : "text-gray-500"}`} />
        </div>
        <div>
          <p className={`text-sm font-medium ${isDarkMode ? "text-white" : "text-gray-800"}`}>{customer}</p>
          <div className="flex items-center gap-2 text-xs text-gray-500">
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
        
        <div className="hidden sm:block">
          <WhisperButton recordingId={id} />
        </div>
        
        <div>
          <p className={`text-xs ${isDarkMode ? "text-gray-500" : "text-gray-500"} text-right`}>Score</p>
          <p className={`text-sm font-medium ${getScoreColor(score)}`}>{score}</p>
        </div>
        
        <AIWaveform 
          barCount={4} 
          color={score >= 80 ? "green" : score >= 60 ? "blue" : "pink"} 
          className="h-5" 
        />
        
        <button className={`${isDarkMode ? "text-gray-400 hover:text-gray-300" : "text-gray-400 hover:text-gray-700"}`}>
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

const CallsOverview = () => {
  const { isDarkMode } = useContext(ThemeContext);
  const [recentCalls, setRecentCalls] = useState<StoredTranscription[]>([]);
  const navigate = useNavigate();
  
  // Load real transcription data
  useEffect(() => {
    const storedTranscriptions = getStoredTranscriptions();
    // Sort by date (newest first) and take the first 5
    const sorted = [...storedTranscriptions].sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    ).slice(0, 5);
    
    setRecentCalls(sorted);
  }, []);

  // Format duration from seconds to minutes and seconds
  const formatDuration = (seconds?: number): string => {
    if (!seconds) return "unknown";
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  // Generate a speaker name if none exists
  const getSpeakerName = (transcript: StoredTranscription): string => {
    if (transcript.speakerName) return transcript.speakerName;
    
    // Generate a random name if none exists
    const firstNames = ["Sarah", "Michael", "Emily", "David", "Jessica", "John", "Rachel", "Robert", "Linda", "William"];
    const lastNames = ["Johnson", "Chen", "Rodriguez", "Kim", "Wong", "Smith", "Brown", "Jones", "Miller", "Davis"];
    
    // Use the transcript ID as a seed for consistent naming
    const idSum = transcript.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const firstName = firstNames[idSum % firstNames.length];
    const lastName = lastNames[(idSum * 13) % lastNames.length];
    
    return `${firstName} ${lastName}`;
  };

  // Format time from ISO string to 12-hour format
  const formatTime = (dateString: string): string => {
    try {
      const date = parseISO(dateString);
      return format(date, 'h:mm a');
    } catch (e) {
      return "Unknown time";
    }
  };
  
  const handleCallClick = (id: string) => {
    navigate(`/transcripts?id=${id}`);
  };

  return (
    <GlowingCard className="mt-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className={`text-xl font-bold ${isDarkMode ? "text-white" : "text-gray-800"}`}>Recent Calls</h2>
        
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-2 ${isDarkMode ? "bg-white/5" : "bg-gray-100"} px-3 py-1.5 rounded-lg text-sm`}>
            <CalendarClock className="h-4 w-4 text-neon-purple" />
            <span className={isDarkMode ? "text-white" : "text-gray-800"}>Today</span>
          </div>
          
          <button 
            className={`${isDarkMode ? "bg-neon-purple/20 hover:bg-neon-purple/30" : "bg-neon-purple/10 hover:bg-neon-purple/20"} text-neon-purple px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1`}
            onClick={() => navigate('/transcripts')}
          >
            <Phone className="h-4 w-4" />
            <span>All Calls</span>
          </button>
        </div>
      </div>
      
      <div className="space-y-1">
        {recentCalls.length > 0 ? (
          recentCalls.map((call) => (
            <CallItem
              key={call.id}
              id={call.id}
              customer={getSpeakerName(call)}
              time={formatTime(call.date)}
              duration={formatDuration(call.duration)}
              score={call.callScore || 0}
              flagged={call.sentiment === 'negative'}
              isDarkMode={isDarkMode}
              onClick={() => handleCallClick(call.id)}
            />
          ))
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Phone className="mx-auto h-12 w-12 mb-4 opacity-50" />
            <p>No call transcriptions yet</p>
            <p className="text-sm mt-2">Upload audio files in the Transcripts section to see your calls here</p>
          </div>
        )}
      </div>
    </GlowingCard>
  );
};

export default CallsOverview;
