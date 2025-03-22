import { useEffect, useRef } from 'react';
import { EventTypeEnum } from '@/types/events';

type EventCallback = (data?: any) => void;

/**
 * Hook to listen for custom events
 * @param eventType The event type to listen for
 * @param callback The callback to run when the event is triggered
 */
export const useEventListener = (
  eventType: string | EventTypeEnum,
  callback: EventCallback
) => {
  // Create a ref to store the callback to avoid unnecessary re-renders
  const callbackRef = useRef<EventCallback>(callback);

  // Update the ref when the callback changes
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    // Event handler that calls the callback with the event data
    const handleEvent = (event: CustomEvent) => {
      callbackRef.current(event.detail);
    };

    // Add event listener
    window.addEventListener(eventType, handleEvent as EventListener);

    // Clean up the event listener on unmount
    return () => {
      window.removeEventListener(eventType, handleEvent as EventListener);
    };
  }, [eventType]);
}; 