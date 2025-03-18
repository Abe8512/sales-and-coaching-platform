// Event types
export type EventType = 
  | 'transcript-created'
  | 'transcript-updated'
  | 'transcript-deleted'
  | 'transcript-progress'
  | 'upload-started'
  | 'upload-progress'
  | 'upload-completed'
  | 'upload-error'
  | 'processing-started'
  | 'processing-progress'
  | 'processing-completed' 
  | 'processing-error'
  | 'connection-restored'
  | 'connection-lost'
  | 'bulk-upload-started'
  | 'bulk-upload-completed'
  | 'recording-completed'
  | 'transcripts-refreshed';

// Event dispatcher type
export type EventDispatcher = (type: EventType, data?: any) => void;

// Event payload interface
export interface EventPayload {
  type: EventType;
  data?: any;
  timestamp: number;
}

// Event listener type
export type EventListener = (event: EventPayload) => void;

// Events store interface
export interface EventsStore {
  listeners: Map<EventType, Set<EventListener>>;
  eventHistory: EventPayload[];
  
  // Methods
  addEventListener: (type: EventType, listener: EventListener) => () => void;
  removeEventListener: (type: EventType, listener: EventListener) => void;
  dispatchEvent: (type: EventType, data?: any) => void;
  clearEventHistory: () => void;
}
