
import React from 'react';
import { EventType, EventListener } from './types';
import { useEventsStore } from './store';

// Simple hook to use the events service
export const useEvents = () => {
  const eventsStore = useEventsStore();
  
  return {
    addEventListener: eventsStore.addEventListener,
    dispatchEvent: eventsStore.dispatchEvent,
    eventHistory: eventsStore.eventHistory
  };
};

// Hook to listen for events
export const useEventListener = (type: EventType, callback: (data?: any) => void) => {
  React.useEffect(() => {
    // Listen using the events store
    const unsubscribe = useEventsStore.getState().addEventListener(type, (event) => {
      callback(event.data);
    });
    
    // Also listen using window events as a fallback
    const handleWindowEvent = (e: Event) => {
      // Cast to CustomEvent to access the detail property
      const customEvent = e as CustomEvent;
      // The detail contains our EventPayload
      const eventPayload = customEvent.detail as EventPayload;
      callback(eventPayload.data);
    };
    
    // Use the correct type for the addEventListener call
    window.addEventListener(`app:${type}`, handleWindowEvent);
    
    return () => {
      unsubscribe();
      window.removeEventListener(`app:${type}`, handleWindowEvent);
    };
  }, [type, callback]);
};
