
import { create } from 'zustand';

// Event types
export type EventType = 
  | 'transcript-created'
  | 'transcript-updated'
  | 'transcript-deleted'
  | 'transcripts-refreshed'
  | 'call-created'
  | 'call-updated'
  | 'call-deleted'
  | 'calls-refreshed'
  | 'bulk-upload-completed'
  | 'bulk-upload-started'
  | 'recording-completed';

// Event payload interface
export interface EventPayload {
  type: EventType;
  data?: any;
  timestamp: number;
}

// Event listener type
export type EventListener = (event: EventPayload) => void;

// Events store interface
interface EventsStore {
  listeners: Map<EventType, Set<EventListener>>;
  eventHistory: EventPayload[];
  
  // Methods
  addEventListener: (type: EventType, listener: EventListener) => () => void;
  removeEventListener: (type: EventType, listener: EventListener) => void;
  dispatchEvent: (type: EventType, data?: any) => void;
  clearEventHistory: () => void;
}

// Create events store
export const useEventsStore = create<EventsStore>((set, get) => ({
  listeners: new Map<EventType, Set<EventListener>>(),
  eventHistory: [],
  
  addEventListener: (type, listener) => {
    set(state => {
      const listeners = state.listeners;
      
      if (!listeners.has(type)) {
        listeners.set(type, new Set());
      }
      
      listeners.get(type)?.add(listener);
      
      return { listeners: new Map(listeners) };
    });
    
    // Return unsubscribe function
    return () => {
      get().removeEventListener(type, listener);
    };
  },
  
  removeEventListener: (type, listener) => {
    set(state => {
      const listeners = state.listeners;
      listeners.get(type)?.delete(listener);
      return { listeners: new Map(listeners) };
    });
  },
  
  dispatchEvent: (type, data) => {
    const event: EventPayload = {
      type,
      data,
      timestamp: Date.now()
    };
    
    // Store event in history
    set(state => ({
      eventHistory: [...state.eventHistory.slice(-100), event] // Keep last 100 events
    }));
    
    // Notify listeners
    get().listeners.get(type)?.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error(`Error in event listener for ${type}:`, error);
      }
    });
    
    // Also dispatch the event to the window so components can listen using the useEffect API
    const customEvent = new CustomEvent(`app:${type}`, { detail: data });
    window.dispatchEvent(customEvent);
    
    console.log(`Event dispatched: ${type}`, data);
  },
  
  clearEventHistory: () => {
    set({ eventHistory: [] });
  }
}));

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
    const handleWindowEvent = (event: CustomEvent) => {
      callback(event.detail);
    };
    
    window.addEventListener(`app:${type}` as any, handleWindowEvent as EventListener);
    
    return () => {
      unsubscribe();
      window.removeEventListener(`app:${type}` as any, handleWindowEvent as EventListener);
    };
  }, [type, callback]);
};

// Helper to create an event emitter for a specific component
export const createEventEmitter = (prefix: string) => {
  const emitter = (type: string, data?: any) => {
    useEventsStore.getState().dispatchEvent(`${prefix}-${type}` as EventType, data);
  };
  
  return emitter;
};

// Initialize the event system by importing this file
const initEvents = () => {
  console.log('Events system initialized');
};

// Call initEvents to ensure the event system is initialized
initEvents();

// Export the needed imports
import React from 'react';
