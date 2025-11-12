# Web Workers Module

This module provides Web Worker-based data processing for the Race Telemetry Dashboard. It handles CPU-intensive operations off the main thread to keep the UI responsive.

## Features

- **Worker Pool Management**: Automatically manages 2-4 workers based on CPU cores
- **Task Queue with Priority**: High-priority tasks are processed first
- **Progress Reporting**: Real-time progress updates during data processing
- **Automatic Error Recovery**: Workers are automatically restarted on crashes
- **Parallel Processing**: Multiple laps can be processed simultaneously

## Architecture

```
┌─────────────────┐
│   Main Thread   │
│  (React App)    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Worker Pool    │
│  Manager        │
└────────┬────────┘
         │
    ┌────┴────┬────────┬────────┐
    ▼         ▼        ▼        ▼
┌────────┐┌────────┐┌────────┐┌────────┐
│Worker 1││Worker 2││Worker 3││Worker 4│
└────────┘└────────┘└────────┘└────────┘
```

## Setup

Initialize the worker pool early in your application:

```typescript
import { setupWorkerPool } from '@/workers/setup';

// In your main.tsx or App.tsx
setupWorkerPool();
```

## Usage

### Basic Usage

```typescript
import { getWorkerPool, TaskPriority } from '@/workers';

const pool = getWorkerPool();

// Parse a lap file
await pool.enqueue(
  {
    type: 'PARSE_LAP',
    url: '/datasets_trimmed/barber_top10/laps/lap_22_11.json.gz',
    lapId: '22_11'
  },
  TaskPriority.HIGH,
  {
    onProgress: (progress) => {
      console.log(`Loading: ${progress}%`);
    },
    onChunk: (chunk) => {
      console.log(`Received ${chunk.length} points`);
    },
    onComplete: (metadata) => {
      console.log('Complete:', metadata);
    },
    onError: (error) => {
      console.error('Error:', error);
    }
  }
);
```

### Upload CSV File

```typescript
const file = event.target.files[0];
const arrayBuffer = await file.arrayBuffer();

await pool.enqueue(
  {
    type: 'PARSE_UPLOAD',
    data: arrayBuffer,
    filename: file.name
  },
  TaskPriority.HIGH,
  {
    onProgress: (progress) => setUploadProgress(progress),
    onChunk: (chunk) => appendTelemetryData(chunk),
    onComplete: (metadata) => setUploadComplete(metadata),
    onError: (error) => showError(error)
  }
);
```

### Downsample Data

```typescript
await pool.enqueue(
  {
    type: 'DOWNSAMPLE',
    data: telemetryPoints,
    targetPoints: 1000
  },
  TaskPriority.NORMAL
);
```

## Worker Messages

### Request Types

#### PARSE_LAP
Fetch, decompress, and parse a compressed lap file.

```typescript
{
  type: 'PARSE_LAP',
  url: string,      // URL to .json.gz file
  lapId: string     // Unique identifier (e.g., "22_11")
}
```

#### PARSE_UPLOAD
Parse uploaded CSV data.

```typescript
{
  type: 'PARSE_UPLOAD',
  data: ArrayBuffer,  // CSV file contents
  filename: string    // Original filename
}
```

#### DOWNSAMPLE
Downsample telemetry data using LTTB algorithm.

```typescript
{
  type: 'DOWNSAMPLE',
  data: TelemetryPoint[],  // Full resolution data
  targetPoints: number     // Target point count (500-2000)
}
```

### Response Types

#### PROGRESS
Progress update during processing.

```typescript
{
  type: 'PROGRESS',
  lapId: string,
  progress: number  // 0-100
}
```

#### CHUNK
Partial data chunk (for progressive rendering).

```typescript
{
  type: 'CHUNK',
  lapId: string,
  chunk: TelemetryPoint[]
}
```

#### COMPLETE
Processing complete with metadata.

```typescript
{
  type: 'COMPLETE',
  lapId: string,
  metadata: {
    duration: number,   // Lap duration in seconds
    maxSpeed: number,   // Maximum speed in km/h
    avgSpeed: number    // Average speed in km/h
  }
}
```

#### ERROR
Processing error.

```typescript
{
  type: 'ERROR',
  lapId: string,
  error: string  // Error message
}
```

## Task Priority

Tasks can be assigned different priorities:

- `TaskPriority.HIGH` (2): User-initiated actions (uploads, selections)
- `TaskPriority.NORMAL` (1): Default priority
- `TaskPriority.LOW` (0): Background tasks (preloading)

Higher priority tasks are processed first.

## Worker Pool API

### `getWorkerPool(): WorkerPool`
Get the singleton worker pool instance.

### `enqueue(request, priority, callbacks): Promise<any>`
Add a task to the queue.

### `cancel(taskId: string): void`
Cancel a pending or running task.

### `clearQueue(): void`
Clear all pending tasks.

### `getPendingCount(): number`
Get the number of pending tasks.

### `getBusyCount(): number`
Get the number of busy workers.

### `terminate(): void`
Terminate all workers and clear the pool.

## Performance Considerations

- **Pool Size**: Defaults to `min(CPU cores, 4)` workers
- **Chunk Size**: Data is sent in 1000-point chunks for progressive rendering
- **Memory**: Each worker has its own memory space
- **Compression**: Gzip decompression happens in workers (using pako)
- **Downsampling**: LTTB algorithm reduces 10,000+ points to 500-2000

## Error Handling

Workers automatically restart on crashes. Tasks in progress when a worker crashes will receive an error callback and can be retried.

```typescript
try {
  await pool.enqueue(request, priority, callbacks);
} catch (error) {
  console.error('Task failed:', error);
  // Retry logic here
}
```

## Testing

```typescript
import { initializeWorkerPool, terminateWorkerPool } from '@/workers';

// Create a mock worker for testing
const mockWorkerFactory = () => {
  return {
    postMessage: vi.fn(),
    terminate: vi.fn(),
    onmessage: null,
    onerror: null
  } as any;
};

beforeEach(() => {
  initializeWorkerPool(mockWorkerFactory, 2);
});

afterEach(() => {
  terminateWorkerPool();
});
```

## LTTB Downsampling

The Largest-Triangle-Three-Buckets algorithm preserves the visual shape of time-series data while reducing point count.

### How It Works

1. Divide data into buckets
2. For each bucket, find the point that forms the largest triangle with:
   - The previously selected point
   - The average of the next bucket
3. Always preserve first and last points

### Benefits

- Preserves peaks and valleys
- Maintains visual accuracy
- Fast computation (O(n))
- Deterministic results

### Usage

```typescript
import { downsampleTelemetry } from '@/utils';

const downsampled = downsampleTelemetry(telemetryPoints, 1000);
```

## Files

- `telemetryWorker.ts` - Worker script that processes data
- `workerPool.ts` - Worker pool manager
- `setup.ts` - Worker pool initialization
- `index.ts` - Module exports
- `README.md` - This file

## References

- [Web Workers API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API)
- [Vite Worker Support](https://vitejs.dev/guide/features.html#web-workers)
- [LTTB Algorithm](https://github.com/sveinn-steinarsson/flot-downsample)
