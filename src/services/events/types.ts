// Event types enum
export enum EventTypeEnum {
  TRANSCRIPT_CREATED = 'transcript-created',
  TRANSCRIPT_UPDATED = 'transcript-updated',
  TRANSCRIPT_DELETED = 'transcript-deleted',
  TRANSCRIPT_PROGRESS = 'transcript-progress',
  UPLOAD_STARTED = 'upload-started',
  UPLOAD_PROGRESS = 'upload-progress',
  UPLOAD_COMPLETED = 'upload-completed',
  UPLOAD_ERROR = 'upload-error',
  PROCESSING_STARTED = 'processing-started',
  PROCESSING_PROGRESS = 'processing-progress',
  PROCESSING_COMPLETED = 'processing-completed',
  PROCESSING_ERROR = 'processing-error',
  CONNECTION_RESTORED = 'connection-restored',
  CONNECTION_LOST = 'connection-lost',
  CONNECTION_UNSTABLE = 'connection-unstable',
  BULK_UPLOAD_STARTED = 'bulk-upload-started',
  BULK_UPLOAD_COMPLETED = 'bulk-upload-completed',
  RECORDING_COMPLETED = 'recording-completed',
  TRANSCRIPTS_REFRESHED = 'transcripts-refreshed'
}

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
  | 'connection-unstable'
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
