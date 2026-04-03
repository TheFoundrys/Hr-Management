import { EventEmitter } from 'events';

// Simple global event emitter for real-time updates
export const attendanceEvents = new EventEmitter();
attendanceEvents.setMaxListeners(100);
