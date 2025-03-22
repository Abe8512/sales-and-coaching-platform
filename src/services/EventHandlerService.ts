/**
 * Centralized service for managing custom events across the application
 * This prevents inconsistencies in how events are dispatched and handled
 */

// Event types supported by the application
export type AppEventType = 
  | 'connection-restored'
  | 'connection-lost'
  | 'supabase-connection-restored'
  | 'supabase-connection-lost'
  | 'auth-state-changed'
  | 'data-refreshed'
  | 'api-error'
  | 'rate-limit-exceeded'
  | 'upload-completed'
  | 'transcription-completed';

// Event detail data interface
export interface AppEventDetail {
  source?: string;
  timestamp?: number;
  data?: any;
}

/**
 * Centralized event handler service
 */
export const eventHandlerService = {
  /**
   * Dispatch a custom event with the standard format
   */
  dispatchEvent: (eventType: AppEventType, detail?: AppEventDetail): boolean => {
    if (typeof window === 'undefined') return false;
    
    // Ensure consistent format for event details
    const eventDetail: AppEventDetail = {
      timestamp: Date.now(),
      source: 'app',
      ...detail
    };
    
    // Create and dispatch the event
    const event = new CustomEvent(eventType, { 
      detail: eventDetail,
      bubbles: true,
      cancelable: true
    });
    
    console.debug(`Dispatching event: ${eventType}`, eventDetail);
    return window.dispatchEvent(event);
  },
  
  /**
   * Listen for custom events
   * @returns A function to remove the event listener
   */
  addEventListener: (
    eventType: AppEventType, 
    handler: (detail: AppEventDetail) => void
  ): (() => void) => {
    if (typeof window === 'undefined') return () => {};
    
    // Create a wrapper to format event details consistently
    const wrappedHandler = (event: Event) => {
      const customEvent = event as CustomEvent;
      handler(customEvent.detail || {});
    };
    
    // Add the event listener
    window.addEventListener(eventType, wrappedHandler);
    
    // Return a cleanup function
    return () => {
      window.removeEventListener(eventType, wrappedHandler);
    };
  },
  
  /**
   * Create an AbortController to signal when an event occurs
   * Useful for cancelling operations based on an event
   */
  createEventAbortController: (eventType: AppEventType): AbortController => {
    const controller = new AbortController();
    
    if (typeof window !== 'undefined') {
      const handleEvent = () => {
        controller.abort();
      };
      
      window.addEventListener(eventType, handleEvent, { signal: controller.signal });
    }
    
    return controller;
  },
  
  /**
   * Map Supabase events to our standardized events
   * This should be called early in app initialization
   */
  setupEventMapping: (): (() => void) => {
    if (typeof window === 'undefined') return () => {};
    
    // Create mapping for Supabase connection events
    const supabaseConnectionRestoredHandler = () => {
      eventHandlerService.dispatchEvent('connection-restored', {
        source: 'supabase',
        data: { type: 'connection' }
      });
    };
    
    const supabaseConnectionLostHandler = () => {
      eventHandlerService.dispatchEvent('connection-lost', {
        source: 'supabase',
        data: { type: 'connection' }
      });
    };
    
    // Create mapping for browser online/offline events
    const browserOnlineHandler = () => {
      eventHandlerService.dispatchEvent('connection-restored', {
        source: 'browser',
        data: { type: 'network' }
      });
    };
    
    const browserOfflineHandler = () => {
      eventHandlerService.dispatchEvent('connection-lost', {
        source: 'browser',
        data: { type: 'network' }
      });
    };
    
    // Add the event listeners
    window.addEventListener('supabase-connection-restored', supabaseConnectionRestoredHandler);
    window.addEventListener('supabase-connection-lost', supabaseConnectionLostHandler);
    window.addEventListener('online', browserOnlineHandler);
    window.addEventListener('offline', browserOfflineHandler);
    
    // Return a cleanup function
    return () => {
      window.removeEventListener('supabase-connection-restored', supabaseConnectionRestoredHandler);
      window.removeEventListener('supabase-connection-lost', supabaseConnectionLostHandler);
      window.removeEventListener('online', browserOnlineHandler);
      window.removeEventListener('offline', browserOfflineHandler);
    };
  }
}; 