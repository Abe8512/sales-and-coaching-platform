
import React, { useEffect, useState } from "react";
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
  duration = 1000,
  className,
  prefix = "",
  suffix = "",
  formatter = (val) => val.toString(),
}: AnimatedNumberProps) => {
  const [displayValue, setDisplayValue] = useState(0);
  
  useEffect(() => {
    const startTime = Date.now();
    const startValue = displayValue;
    const endValue = value;
    const difference = endValue - startValue;
    
    const updateValue = () => {
      const now = Date.now();
      const elapsedTime = now - startTime;
      
      if (elapsedTime < duration) {
        const newValue = startValue + (difference * (elapsedTime / duration));
        setDisplayValue(newValue);
        requestAnimationFrame(updateValue);
      } else {
        setDisplayValue(endValue);
      }
    };
    
    requestAnimationFrame(updateValue);
  }, [value, duration]);
  
  return (
    <span className={cn("font-medium", className)}>
      {prefix}{formatter(Math.round(displayValue * 100) / 100)}{suffix}
    </span>
  );
};

export default AnimatedNumber;
