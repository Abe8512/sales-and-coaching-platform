
import React, { useEffect, useState, useRef, memo } from "react";
import { cn } from "@/lib/utils";

interface AnimatedNumberProps {
  value: number;
  duration?: number;
  className?: string;
  prefix?: string;
  suffix?: string;
  formatter?: (value: number) => string;
}

const AnimatedNumber = memo(({
  value,
  duration = 1000, // Reduced duration for faster animations
  className,
  prefix = "",
  suffix = "",
  formatter = (val) => val.toString(),
}: AnimatedNumberProps) => {
  const [displayValue, setDisplayValue] = useState(value);
  const animationFrameRef = useRef<number | null>(null);
  const lastUpdateTimeRef = useRef<number>(Date.now());
  const startTimeRef = useRef<number>(0);
  const startValueRef = useRef<number>(0);
  
  useEffect(() => {
    // Debounce value changes to prevent rapid updates
    const now = Date.now();
    if (now - lastUpdateTimeRef.current < 200) {
      return; // Skip animation if changes are too frequent
    }
    
    lastUpdateTimeRef.current = now;
    
    // If the value change is tiny, don't animate
    if (Math.abs(value - displayValue) < 0.5) {
      setDisplayValue(value);
      return;
    }
    
    startTimeRef.current = Date.now();
    startValueRef.current = displayValue;
    const endValue = value;
    const difference = endValue - startValueRef.current;
    
    const updateValue = () => {
      const now = Date.now();
      const elapsedTime = now - startTimeRef.current;
      
      if (elapsedTime < duration) {
        // Use easeOutCubic for smoother animation
        const progress = 1 - Math.pow(1 - elapsedTime / duration, 3);
        const newValue = startValueRef.current + (difference * progress);
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
    <span className={cn("font-medium hardware-accelerated", className)}>
      {prefix}{formatter(Math.round(displayValue * 100) / 100)}{suffix}
    </span>
  );
});

AnimatedNumber.displayName = "AnimatedNumber";

export default AnimatedNumber;
