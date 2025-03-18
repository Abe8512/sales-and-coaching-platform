
import { create } from 'zustand';
import { EventType, EventListener, EventPayload, EventsStore } from './types';

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
    
    // Also dispatch the event to the window as a CustomEvent
    const customEvent = new CustomEvent(`app:${type}`, { detail: event });
    window.dispatchEvent(customEvent);
    
    console.log(`Event dispatched: ${type}`, data);
  },
  
  clearEventHistory: () => {
    set({ eventHistory: [] });
  }
}));
