
import React, { useEffect, useState, useRef } from "react";
import { cn } from "@/lib/utils";

interface AnimatedNumberProps {
  value: number;
  duration?: number;
  className?: string;
  prefix?: string;
  suffix?: string;
  formatter?: (value: number) => string;
}

const AnimatedNumber = ({
  value,
  duration = 1500, // Increased duration for smoother animation
  className,
  prefix = "",
  suffix = "",
  formatter = (val) => val.toString(),
}: AnimatedNumberProps) => {
  const [displayValue, setDisplayValue] = useState(value);
  const animationFrameRef = useRef<number | null>(null);
  const lastUpdateTimeRef = useRef<number>(Date.now());
  
  useEffect(() => {
    // Debounce value changes to prevent rapid updates
    const now = Date.now();
    if (now - lastUpdateTimeRef.current < 300) {
      return; // Skip animation if changes are too frequent
    }
    
    lastUpdateTimeRef.current = now;
    
    // If the value change is tiny, don't animate
    if (Math.abs(value - displayValue) < 0.5) {
      setDisplayValue(value);
      return;
    }
    
    const startTime = Date.now();
    const startValue = displayValue;
    const endValue = value;
    const difference = endValue - startValue;
    
    const updateValue = () => {
      const now = Date.now();
      const elapsedTime = now - startTime;
      
      if (elapsedTime < duration) {
        // Use easeOutQuad for smoother animation
        const progress = 1 - Math.pow(1 - elapsedTime / duration, 2);
        const newValue = startValue + (difference * progress);
        setDisplayValue(newValue);
        animationFrameRef.current = requestAnimationFrame(updateValue);
      } else {
        setDisplayValue(endValue);
        animationFrameRef.current = null;
      }
    };
    
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    
    animationFrameRef.current = requestAnimationFrame(updateValue);
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [value, duration, displayValue]);
  
  return (
    <span className={cn("font-medium", className)}>
      {prefix}{formatter(Math.round(displayValue * 100) / 100)}{suffix}
    </span>
  );
};

export default AnimatedNumber;
