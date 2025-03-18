
import React, { useState, useEffect } from 'react';
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface ContentLoaderProps {
  isLoading: boolean;
  children: React.ReactNode;
  className?: string;
  height?: string | number;
  width?: string | number;
  delay?: number; // Minimum loading time to prevent flashes
  skeletonCount?: number; // Number of skeleton items to show
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
  skeletonCount = 1
}) => {
  const [showContent, setShowContent] = useState(!isLoading);
  const [delayedLoading, setDelayedLoading] = useState(isLoading);
  
  useEffect(() => {
    let timeout: NodeJS.Timeout;
    
    // If no longer loading, set a minimum delay to prevent UI flashing
    if (!isLoading && delayedLoading) {
      timeout = setTimeout(() => {
        setDelayedLoading(false);
        // Brief delay before showing content to allow for CSS transitions
        setTimeout(() => setShowContent(true), 50);
      }, delay);
    } 
    // If loading starts again
    else if (isLoading && !delayedLoading) {
      setShowContent(false);
      timeout = setTimeout(() => {
        setDelayedLoading(true);
      }, 50);
    }
    
    return () => clearTimeout(timeout);
  }, [isLoading, delay, delayedLoading]);
  
  return (
    <div className={cn("relative", className)} style={{ height, width }}>
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
              className={`mb-2 ${typeof height === 'number' ? `h-[${height / skeletonCount - 8}px]` : 'h-[60px]'}`}
            />
          ))}
        </div>
      )}
      
      <div 
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
