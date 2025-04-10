import React from 'react';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface Interruption {
  time: number;
  interruptedSpeaker: string;
  interruptingSpeaker: string;
  interruptedWord: string;
  interruptingWord: string;
}

interface InterruptionChartProps {
  interruptions: Interruption[];
  callDuration?: number;
}

const InterruptionChart: React.FC<InterruptionChartProps> = ({ 
  interruptions, 
  callDuration = 0 
}) => {
  // If no data or no interruptions, show a placeholder
  if (!interruptions || interruptions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Interruption Analysis</CardTitle>
          <CardDescription>
            No interruptions detected in this conversation
          </CardDescription>
        </CardHeader>
        <CardContent className="h-64 flex items-center justify-center text-muted-foreground">
          No interruptions detected
        </CardContent>
      </Card>
    );
  }
  
  // Count interruptions by speaker
  const interruptionsBySpeaker: Record<string, number> = {};
  const interruptedBySpeaker: Record<string, number> = {};
  
  interruptions.forEach(interruption => {
    // Count times each speaker interrupts
    interruptionsBySpeaker[interruption.interruptingSpeaker] = 
      (interruptionsBySpeaker[interruption.interruptingSpeaker] || 0) + 1;
    
    // Count times each speaker gets interrupted
    interruptedBySpeaker[interruption.interruptedSpeaker] = 
      (interruptedBySpeaker[interruption.interruptedSpeaker] || 0) + 1;
  });
  
  // Prepare data for the chart
  const chartData = Object.keys({ ...interruptionsBySpeaker, ...interruptedBySpeaker })
    .map(speaker => ({
      name: speaker,
      interruptions: interruptionsBySpeaker[speaker] || 0,
      interrupted: interruptedBySpeaker[speaker] || 0
    }));
  
  // Calculate interruption frequency per minute
  const interruptionsPerMinute = callDuration 
    ? Math.round((interruptions.length / (callDuration / 60)) * 10) / 10
    : 0;
  
  // Find segments of the call with high interruption density
  const interruptionTimes = interruptions.map(i => i.time);
  let highDensitySegments = [];
  
  if (interruptionTimes.length > 1) {
    // Sort times
    interruptionTimes.sort((a, b) => a - b);
    
    // Find segments with interruptions less than 10 seconds apart
    let segmentStart = interruptionTimes[0];
    let segmentCount = 1;
    let currentSegment = [segmentStart];
    
    for (let i = 1; i < interruptionTimes.length; i++) {
      const timeBetween = interruptionTimes[i] - interruptionTimes[i-1];
      
      if (timeBetween < 10) {
        // Still in the same segment
        segmentCount++;
        currentSegment.push(interruptionTimes[i]);
      } else {
        // End current segment if it had multiple interruptions
        if (segmentCount > 1) {
          highDensitySegments.push({
            start: segmentStart,
            end: interruptionTimes[i-1],
            count: segmentCount,
            duration: interruptionTimes[i-1] - segmentStart
          });
        }
        
        // Start new segment
        segmentStart = interruptionTimes[i];
        segmentCount = 1;
        currentSegment = [segmentStart];
      }
    }
    
    // Check last segment
    if (segmentCount > 1) {
      highDensitySegments.push({
        start: segmentStart,
        end: interruptionTimes[interruptionTimes.length - 1],
        count: segmentCount,
        duration: interruptionTimes[interruptionTimes.length - 1] - segmentStart
      });
    }
    
    // Sort segments by interruption count (density)
    highDensitySegments.sort((a, b) => b.count - a.count);
  }
  
  // Format time as MM:SS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Interruption Analysis</CardTitle>
        <CardDescription>
          {interruptions.length} interruptions detected 
          {callDuration ? ` (${interruptionsPerMinute} per minute)` : ''}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="interruptions" name="Interrupts Others" fill="#4f46e5" />
              <Bar dataKey="interrupted" name="Gets Interrupted" fill="#ef4444" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        
        {highDensitySegments.length > 0 && (
          <div className="mt-4">
            <h4 className="text-sm font-medium mb-2">High Interruption Segments:</h4>
            <div className="space-y-2">
              {highDensitySegments.slice(0, 3).map((segment, index) => (
                <div 
                  key={index} 
                  className="p-2 bg-muted rounded-md text-sm flex justify-between"
                >
                  <span>
                    {formatTime(segment.start)} - {formatTime(segment.end)}
                  </span>
                  <span className="font-medium">
                    {segment.count} interruptions in {Math.round(segment.duration)} seconds
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
        
        <div className="mt-4 text-sm text-muted-foreground">
          <p>
            Interruptions may indicate conversational dominance or high engagement.
            Frequent interruptions can impact conversation quality and perception.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default InterruptionChart; 