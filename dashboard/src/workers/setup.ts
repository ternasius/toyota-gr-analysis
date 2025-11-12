/**
 * Worker Pool Setup
 * 
 * Initializes the worker pool with Vite's worker handling.
 * Import this module early in your app to set up workers.
 */

import { initializeWorkerPool } from './workerPool';
// @ts-ignore - Vite handles ?worker imports
import TelemetryWorker from './telemetryWorker?worker';

/**
 * Set up the worker pool
 * Call this once during app initialization
 */
export function setupWorkerPool(): void {
  initializeWorkerPool(() => new TelemetryWorker());
}
