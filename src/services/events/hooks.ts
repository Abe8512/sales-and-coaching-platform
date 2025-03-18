
import React from 'react';
import { EventType, EventListener, EventPayload } from './types';
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
    const handleWindowEvent = (e: CustomEvent<EventPayload>) => {
      // Access the EventPayload from the CustomEvent's detail property
      const eventPayload = e.detail;
      callback(eventPayload.data);
    };
    
    // Use the correct event type string and cast the handler to EventListenerOrEventListenerObject
    window.addEventListener(`app:${type}`, handleWindowEvent as EventListenerOrEventListenerObject);
    
    return () => {
      unsubscribe();
      window.removeEventListener(`app:${type}`, handleWindowEvent as EventListenerOrEventListenerObject);
    };
  }, [type, callback]);
};
