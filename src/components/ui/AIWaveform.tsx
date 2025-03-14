
import React, { useEffect, useState } from "react";
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

  const colorMap = {
    blue: "bg-neon-blue",
    purple: "bg-neon-purple",
    pink: "bg-neon-pink",
    green: "bg-neon-green",
  };

  useEffect(() => {
    if (animated) {
      const interval = setInterval(() => {
        const newHeights = Array.from({ length: barCount }, () =>
          Math.floor(Math.random() * 25) + 5
        );
        setHeights(newHeights);
      }, 150);
      return () => clearInterval(interval);
    } else {
      setHeights(Array.from({ length: barCount }, () => 
        Math.floor(Math.random() * 25) + 5
      ));
    }
  }, [animated, barCount]);

  return (
    <div className={cn("flex items-end h-8 gap-[2px]", className)}>
      {heights.map((height, index) => (
        <div
          key={index}
          className={cn(
            "w-1 rounded-full transition-all duration-200",
            colorMap[color]
          )}
          style={{ height: `${height}px` }}
        ></div>
      ))}
    </div>
  );
};

export default AIWaveform;
