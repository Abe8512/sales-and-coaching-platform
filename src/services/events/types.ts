
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
export interface EventsStore {
  listeners: Map<EventType, Set<EventListener>>;
  eventHistory: EventPayload[];
  
  // Methods
  addEventListener: (type: EventType, listener: EventListener) => () => void;
  removeEventListener: (type: EventType, listener: EventListener) => void;
  dispatchEvent: (type: EventType, data?: any) => void;
  clearEventHistory: () => void;
}
