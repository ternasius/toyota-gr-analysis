/**
 * Web Workers Module
 * 
 * Exports worker pool manager and related utilities for telemetry data processing
 */

export { 
  WorkerPool, 
  TaskPriority, 
  initializeWorkerPool,
  getWorkerPool, 
  terminateWorkerPool 
} from './workerPool';
export type { WorkerRequest, WorkerResponse } from '../types/store';
