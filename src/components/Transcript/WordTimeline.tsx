import React, { useRef, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

// Define the WordTimestamp interface
interface WordTimestamp {
  word: string;
  start: number;
  end: number;
  confidence?: number;
  speaker?: string;
}

interface WordTimelineProps {
  words: WordTimestamp[];
  height?: number;
  showSpeakers?: boolean;
}

const WordTimeline: React.FC<WordTimelineProps> = ({ 
  words, 
  height = 100, 
  showSpeakers = true 
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Colors for different speakers
  const speakerColors = {
    'Agent': '#4f46e5', // Indigo
    'Customer': '#ef4444', // Red
    'default': '#9ca3af' // Gray
  };
  
  useEffect(() => {
    if (!words || words.length === 0 || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Calculate total duration
    const startTime = words[0].start;
    const endTime = words[words.length - 1].end;
    const duration = endTime - startTime;
    
    // Calculate scale factor
    const scaleX = canvas.width / duration;
    
    // Vertical positions
    const mainLineY = height / 2;
    const wordLineHeight = height * 0.4;
    
    // Draw the main timeline
    ctx.beginPath();
    ctx.moveTo(0, mainLineY);
    ctx.lineTo(canvas.width, mainLineY);
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Draw time markers (every second)
    const seconds = Math.ceil(duration);
    for (let i = 0; i <= seconds; i++) {
      const x = (i / seconds) * canvas.width;
      
      // Draw marker line
      ctx.beginPath();
      ctx.moveTo(x, mainLineY - 5);
      ctx.lineTo(x, mainLineY + 5);
      ctx.strokeStyle = '#9ca3af';
      ctx.lineWidth = 1;
      ctx.stroke();
      
      // Draw time label
      ctx.fillStyle = '#6b7280';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${i}s`, x, mainLineY + 20);
    }
    
    // Draw words
    words.forEach((word, index) => {
      // Calculate word position and width
      const wordStart = (word.start - startTime) * scaleX;
      const wordWidth = (word.end - word.start) * scaleX;
      
      // Get speaker color
      const speakerColor = word.speaker && speakerColors[word.speaker as keyof typeof speakerColors]
        ? speakerColors[word.speaker as keyof typeof speakerColors]
        : speakerColors.default;
      
      // Draw word block
      ctx.fillStyle = speakerColor;
      ctx.globalAlpha = word.confidence ? word.confidence : 0.8;
      ctx.fillRect(wordStart, mainLineY - wordLineHeight / 2, wordWidth, wordLineHeight);
      ctx.globalAlpha = 1.0;
      
      // Draw word text for wider blocks
      if (wordWidth > 30) {
        ctx.fillStyle = '#ffffff';
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(
          word.word, 
          wordStart + wordWidth / 2, 
          mainLineY
        );
      }
      
      // Draw speaker label if needed and if we have the space
      if (showSpeakers && word.speaker && index % 10 === 0 && wordWidth > 20) {
        ctx.fillStyle = speakerColor;
        ctx.font = 'bold 10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(word.speaker, wordStart + wordWidth / 2, mainLineY - wordLineHeight / 2 - 10);
      }
    });
    
    // Draw interruptions if they exist (words with minimal gaps between speakers)
    const interruptionThreshold = 0.3; // 300ms
    for (let i = 1; i < words.length; i++) {
      const prevWord = words[i-1];
      const currentWord = words[i];
      
      if (prevWord.speaker && 
          currentWord.speaker && 
          prevWord.speaker !== currentWord.speaker) {
        
        const timeBetween = currentWord.start - prevWord.end;
        
        if (timeBetween < interruptionThreshold) {
          // Calculate position
          const x = (prevWord.end - startTime) * scaleX;
          
          // Draw interruption marker
          ctx.beginPath();
          ctx.moveTo(x, mainLineY - height * 0.4);
          ctx.lineTo(x, mainLineY + height * 0.4);
          ctx.strokeStyle = '#fb923c'; // Orange
          ctx.lineWidth = 2;
          ctx.stroke();
          
          // Draw lightning bolt icon or similar for interruption
          ctx.fillStyle = '#fb923c';
          ctx.font = 'bold 12px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('⚡', x, mainLineY - height * 0.4 - 10);
        }
      }
    }
    
  }, [words, height, showSpeakers]);
  
  // Create a legend for the speaker colors
  const renderLegend = () => {
    if (!showSpeakers) return null;
    
    return (
      <div className="flex gap-4 justify-center mt-2 text-sm">
        {Object.entries(speakerColors).map(([speaker, color]) => {
          if (speaker === 'default') return null;
          
          return (
            <div key={speaker} className="flex items-center">
              <div 
                className="w-3 h-3 mr-1 rounded-full" 
                style={{ backgroundColor: color }}
              />
              <span>{speaker}</span>
            </div>
          );
        })}
      </div>
    );
  };
  
  // Calculate if we have enough data to render
  const hasValidData = words && words.length > 0;
  
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Word-level Timeline</CardTitle>
        <CardDescription>
          Visualize word timing and speaker changes
        </CardDescription>
      </CardHeader>
      <CardContent>
        {hasValidData ? (
          <>
            <canvas 
              ref={canvasRef} 
              width={800} 
              height={height}
              className="w-full h-auto"
            />
            {renderLegend()}
            
            <div className="mt-4 text-sm text-muted-foreground">
              <p>
                <span className="inline-block bg-orange-400 w-3 h-3 rounded-full mr-1"></span>
                <strong>⚡ Interruptions</strong> are shown where speakers overlap or change with minimal gap
              </p>
              <p className="mt-1">
                Word width indicates duration, helping identify emphasized words and speaking patterns
              </p>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-24 text-muted-foreground">
            No word-level data available for this transcript
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default WordTimeline; 