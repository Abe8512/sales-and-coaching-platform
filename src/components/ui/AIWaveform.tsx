
import React, { useEffect, useState, useRef } from "react";
import { cn } from "@/lib/utils";

interface AIWaveformProps {
  className?: string;
  color?: "blue" | "purple" | "pink" | "green";
  animated?: boolean;
  barCount?: number;
}

const AIWaveform = ({
  className,
  color = "blue",
  animated = true,
  barCount = 10,
}: AIWaveformProps) => {
  const [heights, setHeights] = useState<number[]>([]);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastUpdateTimeRef = useRef<number>(0);

  const colorMap = {
    blue: "bg-neon-blue",
    purple: "bg-neon-purple",
    pink: "bg-neon-pink",
    green: "bg-neon-green",
  };

  // Initialize with some random heights
  useEffect(() => {
    const initialHeights = Array.from({ length: barCount }, () => 
      Math.floor(Math.random() * 15) + 10
    );
    setHeights(initialHeights);
    
    if (animated) {
      // Smoother animation with throttling
      const animateWaveform = () => {
        const now = Date.now();
        // Throttle updates to max 4 per second
        if (now - lastUpdateTimeRef.current < 250) {
          return;
        }
        
        lastUpdateTimeRef.current = now;
        
        // Make smoother transitions - only change 2-4 bars at a time
        setHeights(prevHeights => {
          const newHeights = [...prevHeights];
          const barsToChange = Math.floor(Math.random() * 3) + 2; // 2-4 bars
          
          for (let i = 0; i < barsToChange; i++) {
            const randomIndex = Math.floor(Math.random() * barCount);
            // Apply smaller changes to heights
            const currentHeight = newHeights[randomIndex];
            const maxChange = 5; // Reduced from typical 20-25
            const change = Math.floor(Math.random() * maxChange * 2) - maxChange;
            newHeights[randomIndex] = Math.max(5, Math.min(30, currentHeight + change));
          }
          
          return newHeights;
        });
      };
      
      // Less frequent updates (750ms instead of 150ms)
      intervalRef.current = setInterval(animateWaveform, 750);
      
      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }
  }, [animated, barCount]);

  return (
    <div className={cn("flex items-end h-8 gap-[2px]", className)}>
      {heights.map((height, index) => (
        <div
          key={index}
          className={cn(
            "w-1 rounded-full transition-all duration-700", // Much slower transition
            colorMap[color]
          )}
          style={{ height: `${height}px` }}
        ></div>
      ))}
    </div>
  );
};

export default AIWaveform;
