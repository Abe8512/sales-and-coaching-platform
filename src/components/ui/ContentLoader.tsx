
import React, { useState, useEffect } from 'react';
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { animationUtils } from "@/utils/animationUtils";

interface ContentLoaderProps {
  isLoading: boolean;
  children: React.ReactNode;
  className?: string;
  height?: string | number;
  width?: string | number;
  delay?: number; // Minimum loading time to prevent flashes
  skeletonCount?: number; // Number of skeleton items to show
  preserveHeight?: boolean; // Keep container height consistent during transitions
}

/**
 * A component that shows a skeleton loading state and prevents content shifting
 */
export const ContentLoader: React.FC<ContentLoaderProps> = ({
  isLoading,
  children,
  className,
  height = "auto",
  width = "100%",
  delay = 300,
  skeletonCount = 1,
  preserveHeight = true
}) => {
  const [showContent, setShowContent] = useState(!isLoading);
  const [delayedLoading, setDelayedLoading] = useState(isLoading);
  const [contentHeight, setContentHeight] = useState<number | null>(null);
  const contentRef = React.useRef<HTMLDivElement>(null);
  
  // Stabilize state changes to prevent rapid toggling
  const stableSetDelayedLoading = animationUtils.debounce(setDelayedLoading, 100);
  
  useEffect(() => {
    let timeout: NodeJS.Timeout;
    
    // Capture initial content height if preserveHeight is true
    if (preserveHeight && contentRef.current && contentHeight === null && !isLoading) {
      setContentHeight(contentRef.current.offsetHeight);
    }
    
    // If no longer loading, set a minimum delay to prevent UI flashing
    if (!isLoading && delayedLoading) {
      timeout = setTimeout(() => {
        stableSetDelayedLoading(false);
        // Brief delay before showing content to allow for CSS transitions
        setTimeout(() => setShowContent(true), 50);
      }, delay);
    } 
    // If loading starts again
    else if (isLoading && !delayedLoading) {
      setShowContent(false);
      timeout = setTimeout(() => {
        stableSetDelayedLoading(true);
      }, 50);
    }
    
    return () => {
      if (timeout) clearTimeout(timeout);
      stableSetDelayedLoading.cancel();
    };
  }, [isLoading, delay, delayedLoading, contentHeight, preserveHeight, stableSetDelayedLoading]);
  
  // Calculate container style with stable height if needed
  const containerStyle: React.CSSProperties = {
    width,
    height: preserveHeight && contentHeight ? contentHeight : height,
    minHeight: typeof height === 'number' ? `${height}px` : height !== 'auto' ? height : undefined
  };
  
  return (
    <div className={cn("relative overflow-hidden", className)} style={containerStyle}>
      {(delayedLoading || !showContent) && (
        <div className="transition-opacity duration-300" 
             style={{ 
               opacity: delayedLoading ? 1 : 0,
               position: 'absolute',
               top: 0,
               left: 0,
               width: '100%',
               height: '100%'
             }}>
          {Array.from({ length: skeletonCount }).map((_, i) => (
            <Skeleton 
              key={i} 
              className={`mb-2 ${typeof height === 'number' ? `h-[${Math.max(60, (height / skeletonCount) - 8)}px]` : 'h-[60px]'}`}
            />
          ))}
        </div>
      )}
      
      <div 
        ref={contentRef}
        className="transition-opacity duration-300" 
        style={{ 
          opacity: showContent ? 1 : 0,
          visibility: showContent ? 'visible' : 'hidden'
        }}
      >
        {children}
      </div>
    </div>
  );
};

export default ContentLoader;
