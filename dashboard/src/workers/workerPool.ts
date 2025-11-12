/**
 * Web Worker Pool Manager
 * 
 * Manages a pool of Web Workers for parallel telemetry data processing.
 * Features:
 * - Dynamic pool sizing based on CPU cores
 * - Task queue with priority support
 * - Automatic worker restart on errors
 * - Progress tracking and callbacks
 */

import type { WorkerRequest, WorkerResponse } from '../types/store';
import type { TelemetryPoint } from '../types/data';

// ============================================================================
// Types
// ============================================================================

/**
 * Task priority levels
 */
export const TaskPriority = {
  LOW: 0,
  NORMAL: 1,
  HIGH: 2
} as const;

export type TaskPriority = typeof TaskPriority[keyof typeof TaskPriority];

/**
 * Task in the queue
 */
interface WorkerTask {
  id: string;
  request: WorkerRequest;
  priority: TaskPriority;
  onProgress?: (progress: number) => void;
  onChunk?: (chunk: TelemetryPoint[]) => void;
  onComplete?: (metadata: any) => void;
  onError?: (error: string) => void;
  resolve: (value: any) => void;
  reject: (error: Error) => void;
}

/**
 * Worker instance in the pool
 */
interface PoolWorker {
  worker: Worker;
  busy: boolean;
  currentTaskId: string | null;
}

// ============================================================================
// Worker Pool Class
// ============================================================================

/**
 * Worker factory function type
 */
export type WorkerFactory = () => Worker;

/**
 * Manages a pool of Web Workers for parallel processing
 */
export class WorkerPool {
  private workers: PoolWorker[] = [];
  private taskQueue: WorkerTask[] = [];
  private poolSize: number;
  private workerFactory: WorkerFactory;

  /**
   * Create a new worker pool
   * @param workerFactory - Function that creates a new worker instance
   * @param poolSize - Number of workers in the pool (defaults to CPU cores, max 4)
   */
  constructor(workerFactory: WorkerFactory, poolSize?: number) {
    this.workerFactory = workerFactory;
    this.poolSize = poolSize || Math.min(navigator.hardwareConcurrency || 2, 4);
    this.initializePool();
  }

  /**
   * Initialize the worker pool
   */
  private initializePool(): void {
    for (let i = 0; i < this.poolSize; i++) {
      this.addWorker();
    }
  }

  /**
   * Add a new worker to the pool
   */
  private addWorker(): void {
    const worker = this.workerFactory();
    
    const poolWorker: PoolWorker = {
      worker,
      busy: false,
      currentTaskId: null
    };

    worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      this.handleWorkerMessage(poolWorker, event.data);
    };

    worker.onerror = (error) => {
      this.handleWorkerError(poolWorker, error);
    };

    this.workers.push(poolWorker);
  }

  /**
   * Handle messages from workers
   */
  private handleWorkerMessage(poolWorker: PoolWorker, response: WorkerResponse): void {
    const task = this.findTaskById(poolWorker.currentTaskId);
    if (!task) return;

    switch (response.type) {
      case 'PROGRESS':
        task.onProgress?.(response.progress);
        break;

      case 'CHUNK':
        task.onChunk?.(response.chunk);
        break;

      case 'COMPLETE':
        task.onComplete?.(response.metadata);
        task.resolve(response.metadata);
        this.completeTask(poolWorker);
        break;

      case 'ERROR':
        task.onError?.(response.error);
        task.reject(new Error(response.error));
        this.completeTask(poolWorker);
        break;
    }
  }

  /**
   * Handle worker errors
   */
  private handleWorkerError(poolWorker: PoolWorker, error: ErrorEvent): void {
    console.error('Worker error:', error);
    
    const task = this.findTaskById(poolWorker.currentTaskId);
    if (task) {
      const errorMessage = error.message || 'Worker crashed';
      task.onError?.(errorMessage);
      task.reject(new Error(errorMessage));
    }

    // Restart the worker
    this.restartWorker(poolWorker);
    
    // Try to process the next task
    this.processNextTask();
  }

  /**
   * Restart a crashed worker
   */
  private restartWorker(poolWorker: PoolWorker): void {
    // Terminate the old worker
    poolWorker.worker.terminate();
    
    // Create a new worker using the factory
    const newWorker = this.workerFactory();
    
    newWorker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      this.handleWorkerMessage(poolWorker, event.data);
    };

    newWorker.onerror = (error) => {
      this.handleWorkerError(poolWorker, error);
    };

    poolWorker.worker = newWorker;
    poolWorker.busy = false;
    poolWorker.currentTaskId = null;
  }

  /**
   * Complete a task and mark worker as available
   */
  private completeTask(poolWorker: PoolWorker): void {
    poolWorker.busy = false;
    poolWorker.currentTaskId = null;
    this.processNextTask();
  }

  /**
   * Find a task by ID
   */
  private findTaskById(taskId: string | null): WorkerTask | undefined {
    if (!taskId) return undefined;
    return this.taskQueue.find(t => t.id === taskId);
  }

  /**
   * Get an available worker
   */
  private getAvailableWorker(): PoolWorker | null {
    return this.workers.find(w => !w.busy) || null;
  }

  /**
   * Process the next task in the queue
   */
  private processNextTask(): void {
    if (this.taskQueue.length === 0) return;

    const worker = this.getAvailableWorker();
    if (!worker) return;

    // Sort queue by priority (highest first)
    this.taskQueue.sort((a, b) => b.priority - a.priority);

    // Get the highest priority task
    const task = this.taskQueue.shift();
    if (!task) return;

    // Assign task to worker
    worker.busy = true;
    worker.currentTaskId = task.id;
    worker.worker.postMessage(task.request);
  }

  /**
   * Add a task to the queue
   * @param request - Worker request
   * @param priority - Task priority
   * @param callbacks - Progress, chunk, complete, and error callbacks
   * @returns Promise that resolves when task completes
   */
  public enqueue(
    request: WorkerRequest,
    priority: TaskPriority = TaskPriority.NORMAL,
    callbacks?: {
      onProgress?: (progress: number) => void;
      onChunk?: (chunk: TelemetryPoint[]) => void;
      onComplete?: (metadata: any) => void;
      onError?: (error: string) => void;
    }
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      const taskId = 'lapId' in request 
        ? request.lapId 
        : 'filename' in request 
        ? request.filename 
        : `task_${Date.now()}`;

      const task: WorkerTask = {
        id: taskId,
        request,
        priority,
        onProgress: callbacks?.onProgress,
        onChunk: callbacks?.onChunk,
        onComplete: callbacks?.onComplete,
        onError: callbacks?.onError,
        resolve,
        reject
      };

      this.taskQueue.push(task);
      this.processNextTask();
    });
  }

  /**
   * Cancel a task by ID
   * @param taskId - ID of the task to cancel
   */
  public cancel(taskId: string): void {
    // Remove from queue if not yet started
    const queueIndex = this.taskQueue.findIndex(t => t.id === taskId);
    if (queueIndex !== -1) {
      const task = this.taskQueue[queueIndex];
      this.taskQueue.splice(queueIndex, 1);
      task.reject(new Error('Task cancelled'));
      return;
    }

    // If task is running, we can't easily cancel it
    // Just mark it as cancelled and ignore future messages
    const worker = this.workers.find(w => w.currentTaskId === taskId);
    if (worker) {
      worker.currentTaskId = null;
      worker.busy = false;
      this.processNextTask();
    }
  }

  /**
   * Clear all pending tasks
   */
  public clearQueue(): void {
    this.taskQueue.forEach(task => {
      task.reject(new Error('Queue cleared'));
    });
    this.taskQueue = [];
  }

  /**
   * Get the number of pending tasks
   */
  public getPendingCount(): number {
    return this.taskQueue.length;
  }

  /**
   * Get the number of busy workers
   */
  public getBusyCount(): number {
    return this.workers.filter(w => w.busy).length;
  }

  /**
   * Terminate all workers and clear the pool
   */
  public terminate(): void {
    this.clearQueue();
    this.workers.forEach(w => w.worker.terminate());
    this.workers = [];
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let workerPoolInstance: WorkerPool | null = null;

/**
 * Initialize the worker pool with a worker factory
 * Must be called before using getWorkerPool()
 * 
 * @param workerFactory - Function that creates worker instances
 * @param poolSize - Optional pool size override
 */
export function initializeWorkerPool(workerFactory: WorkerFactory, poolSize?: number): void {
  if (workerPoolInstance) {
    workerPoolInstance.terminate();
  }
  workerPoolInstance = new WorkerPool(workerFactory, poolSize);
}

/**
 * Get the singleton worker pool instance
 * Throws if pool hasn't been initialized
 */
export function getWorkerPool(): WorkerPool {
  if (!workerPoolInstance) {
    throw new Error('Worker pool not initialized. Call initializeWorkerPool() first.');
  }
  return workerPoolInstance;
}

/**
 * Terminate the worker pool
 * Useful for cleanup or testing
 */
export function terminateWorkerPool(): void {
  if (workerPoolInstance) {
    workerPoolInstance.terminate();
    workerPoolInstance = null;
  }
}
