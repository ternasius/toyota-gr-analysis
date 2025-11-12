# Worker Pool Integration Example

This document shows how to integrate the worker pool with the Zustand store for the `loadLapTelemetry` action.

## Store Integration

```typescript
// In useDashboardStore.ts

import { getWorkerPool, TaskPriority } from '@/workers';
import { getCachedLap, setCachedLap } from '@/utils/cache';
import type { TelemetryPoint, LapTelemetry } from '@/types/data';

export const useDashboardStore = create<DashboardStore>((set, get) => ({
  // ... other state ...

  loadLapTelemetry: async (driverNumber: number, lapNumber: number) => {
    const lapId = `${driverNumber}_${lapNumber}`;
    const { selectedTrack } = get();
    
    if (!selectedTrack) {
      throw new Error('No track selected');
    }

    // Check cache first
    const cached = await getCachedLap(selectedTrack, driverNumber, lapNumber);
    if (cached) {
      set((state) => ({
        telemetryData: new Map(state.telemetryData).set(lapId, cached),
        loadingStatus: new Map(state.loadingStatus).set(lapId, {
          status: 'complete',
          progress: 100
        })
      }));
      return;
    }

    // Set loading status
    set((state) => ({
      loadingStatus: new Map(state.loadingStatus).set(lapId, {
        status: 'fetching',
        progress: 0
      })
    }));

    try {
      // Get worker pool
      const pool = getWorkerPool();
      
      // Construct lap file URL
      const url = `/datasets_trimmed/${selectedTrack}/laps/lap_${driverNumber}_${lapNumber}.json.gz`;
      
      // Accumulate chunks
      const chunks: TelemetryPoint[] = [];
      
      // Enqueue worker task
      const metadata = await pool.enqueue(
        {
          type: 'PARSE_LAP',
          url,
          lapId
        },
        TaskPriority.HIGH,
        {
          onProgress: (progress) => {
            set((state) => ({
              loadingStatus: new Map(state.loadingStatus).set(lapId, {
                status: 'parsing',
                progress
              })
            }));
          },
          onChunk: (chunk) => {
            chunks.push(...chunk);
            
            // Progressive rendering: update telemetry data with partial data
            const partialLap: LapTelemetry = {
              driverNumber,
              lapNumber,
              points: [...chunks],
              sectors: [], // Will be calculated when complete
              metadata: {
                duration: 0,
                maxSpeed: 0,
                avgSpeed: 0
              }
            };
            
            set((state) => ({
              telemetryData: new Map(state.telemetryData).set(lapId, partialLap)
            }));
          },
          onComplete: (metadata) => {
            // Calculate sectors from driver stats
            const { driverStats } = get();
            const driverStat = driverStats.find(d => d.NUMBER === driverNumber);
            
            const sectors = driverStat ? [
              {
                sectorNumber: 1 as const,
                startTime: 0,
                endTime: driverStat.S1Best,
                duration: driverStat.S1Best
              },
              {
                sectorNumber: 2 as const,
                startTime: driverStat.S1Best,
                endTime: driverStat.S1Best + driverStat.S2Best,
                duration: driverStat.S2Best
              },
              {
                sectorNumber: 3 as const,
                startTime: driverStat.S1Best + driverStat.S2Best,
                endTime: metadata.duration,
                duration: driverStat.S3Best
              }
            ] : [];
            
            // Create final lap telemetry
            const lapTelemetry: LapTelemetry = {
              driverNumber,
              lapNumber,
              points: chunks,
              sectors,
              metadata
            };
            
            // Update store
            set((state) => ({
              telemetryData: new Map(state.telemetryData).set(lapId, lapTelemetry),
              loadingStatus: new Map(state.loadingStatus).set(lapId, {
                status: 'complete',
                progress: 100
              })
            }));
            
            // Cache the result
            setCachedLap(selectedTrack, driverNumber, lapNumber, lapTelemetry);
          },
          onError: (error) => {
            set((state) => ({
              loadingStatus: new Map(state.loadingStatus).set(lapId, {
                status: 'error',
                progress: 0,
                error
              })
            }));
          }
        }
      );
    } catch (error) {
      set((state) => ({
        loadingStatus: new Map(state.loadingStatus).set(lapId, {
          status: 'error',
          progress: 0,
          error: error instanceof Error ? error.message : String(error)
        })
      }));
      throw error;
    }
  },

  // ... other actions ...
}));
```

## App Initialization

```typescript
// In main.tsx or App.tsx

import { setupWorkerPool } from '@/workers/setup';

// Initialize worker pool before rendering
setupWorkerPool();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

## Component Usage

```typescript
// In a React component

import { useDashboardStore } from '@/store';

function TelemetryChart() {
  const { 
    selectedDrivers, 
    telemetryData, 
    loadingStatus, 
    loadLapTelemetry 
  } = useDashboardStore();

  useEffect(() => {
    // Load telemetry for selected drivers
    selectedDrivers.forEach(driverNumber => {
      const lapNumber = 1; // Get from lap times
      const lapId = `${driverNumber}_${lapNumber}`;
      
      // Check if already loaded
      if (!telemetryData.has(lapId)) {
        loadLapTelemetry(driverNumber, lapNumber);
      }
    });
  }, [selectedDrivers, telemetryData, loadLapTelemetry]);

  return (
    <div>
      {selectedDrivers.map(driverNumber => {
        const lapId = `${driverNumber}_1`;
        const status = loadingStatus.get(lapId);
        const data = telemetryData.get(lapId);

        if (status?.status === 'error') {
          return <div key={lapId}>Error: {status.error}</div>;
        }

        if (!data || status?.status !== 'complete') {
          return (
            <div key={lapId}>
              Loading: {status?.progress || 0}%
            </div>
          );
        }

        return (
          <div key={lapId}>
            {/* Render chart with data.points */}
          </div>
        );
      })}
    </div>
  );
}
```

## Upload Integration

```typescript
// In UploadComparator component

import { getWorkerPool, TaskPriority } from '@/workers';

async function handleFileUpload(file: File) {
  const arrayBuffer = await file.arrayBuffer();
  const pool = getWorkerPool();
  
  const chunks: TelemetryPoint[] = [];
  
  try {
    const metadata = await pool.enqueue(
      {
        type: 'PARSE_UPLOAD',
        data: arrayBuffer,
        filename: file.name
      },
      TaskPriority.HIGH,
      {
        onProgress: (progress) => {
          setUploadProgress(progress);
        },
        onChunk: (chunk) => {
          chunks.push(...chunk);
        },
        onComplete: (metadata) => {
          const uploadedLap: LapTelemetry = {
            driverNumber: 0, // User upload
            lapNumber: 0,
            points: chunks,
            sectors: [],
            metadata
          };
          
          // Update store
          useDashboardStore.getState().uploadLap(uploadedLap);
        },
        onError: (error) => {
          showError(error);
        }
      }
    );
  } catch (error) {
    console.error('Upload failed:', error);
  }
}
```

## Downsampling Integration

```typescript
// In TelemetryChart component

import { getWorkerPool, TaskPriority } from '@/workers';
import { downsampleTelemetry } from '@/utils';

function TelemetryChart({ data }: { data: TelemetryPoint[] }) {
  const [displayData, setDisplayData] = useState<TelemetryPoint[]>([]);

  useEffect(() => {
    if (data.length > 2000) {
      // Downsample in worker for large datasets
      const pool = getWorkerPool();
      
      pool.enqueue(
        {
          type: 'DOWNSAMPLE',
          data,
          targetPoints: 1000
        },
        TaskPriority.NORMAL
      ).then((downsampled) => {
        setDisplayData(downsampled);
      });
    } else {
      // Use full data for small datasets
      setDisplayData(data);
    }
  }, [data]);

  return <PlotlyChart data={displayData} />;
}
```

## Error Handling

```typescript
// Retry logic for failed tasks

async function loadWithRetry(
  driverNumber: number, 
  lapNumber: number, 
  maxRetries = 3
) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      await useDashboardStore.getState().loadLapTelemetry(driverNumber, lapNumber);
      return; // Success
    } catch (error) {
      if (attempt === maxRetries - 1) {
        throw error; // Final attempt failed
      }
      
      // Wait before retrying (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
    }
  }
}
```

## Cleanup

```typescript
// In App.tsx or main component

import { terminateWorkerPool } from '@/workers';

useEffect(() => {
  return () => {
    // Cleanup on unmount
    terminateWorkerPool();
  };
}, []);
```
