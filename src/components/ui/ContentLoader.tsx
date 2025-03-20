import React, { useState, useEffect, useRef, memo, useCallback } from 'react';
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { animationUtils } from "@/utils/animationUtils";
import { useStableLoadingState } from "@/hooks/useStableLoadingState";

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
 * An optimized component that shows a skeleton loading state and prevents content shifting
 */
export const ContentLoader = memo(({
  isLoading,
  children,
  className,
  height = "auto",
  width = "100%",
  delay = 500, // Increased from 300ms to 500ms to prevent flickers
  skeletonCount = 1,
  preserveHeight = true
}: ContentLoaderProps) => {
  // Use stable loading state to prevent flickers
  const stableLoading = useStableLoadingState(isLoading, delay);
  const [contentHeight, setContentHeight] = useState<number | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const prevLoadingRef = useRef(isLoading);
  
  // Measure content height once it's available
  const updateContentHeight = useCallback(() => {
    if (preserveHeight && contentRef.current) {
      const newHeight = animationUtils.getStableHeight(contentRef.current);
      setContentHeight(prev => {
        // Only update if the change is significant (8px or more)
        if (prev === null || Math.abs(newHeight - prev) >= 8) {
          return newHeight;
        }
        return prev;
      });
    }
  }, [preserveHeight]);

  // Set up resize observer to update height when content changes
  useEffect(() => {
    if (preserveHeight && contentRef.current) {
      // Only measure height when not in loading state
      if (!stableLoading) {
        updateContentHeight();
      }
      
      // Set up resize observer for dynamic content
      if (!resizeObserverRef.current && window.ResizeObserver) {
        resizeObserverRef.current = new ResizeObserver(updateContentHeight);
        resizeObserverRef.current.observe(contentRef.current);
      }
      
      return () => {
        if (resizeObserverRef.current) {
          resizeObserverRef.current.disconnect();
          resizeObserverRef.current = null;
        }
      };
    }
  }, [preserveHeight, stableLoading, updateContentHeight]);
  
  // Calculate container style with stable height if needed
  const containerStyle: React.CSSProperties = {
    width,
    height: preserveHeight && contentHeight ? contentHeight : height,
    minHeight: typeof height === 'number' ? `${height}px` : height !== 'auto' ? height : undefined
  };
  
  // Generate skeleton items with optimized rendering
  const renderSkeletons = useCallback(() => {
    return Array.from({ length: skeletonCount }).map((_, i) => (
      <Skeleton 
        key={i} 
        className={`mb-2 ${typeof height === 'number' ? `h-[${Math.max(60, Math.floor((Number(height) / skeletonCount) - 8))}px]` : 'h-[60px]'}`}
      />
    ));
  }, [skeletonCount, height]);
  
  // Optimize the transition between states
  return (
    <div className={cn("relative overflow-hidden", className)} style={containerStyle}>
      {stableLoading && (
        <div 
          className="absolute top-0 left-0 w-full h-full transition-opacity duration-300"
          style={{ opacity: 1 }}
        >
          {renderSkeletons()}
        </div>
      )}
      
      <div 
        ref={contentRef}
        className={cn(
          "transition-opacity duration-300",
          stableLoading ? "opacity-0 invisible" : "opacity-100 visible"
        )}
      >
        {children}
      </div>
    </div>
  );
});

ContentLoader.displayName = "ContentLoader";

export default ContentLoader;
