# Dashboard Store

This directory contains the Zustand store implementation for the Race Telemetry Dashboard.

## Usage

### Basic Usage

```typescript
import { useDashboardStore } from './store';

function MyComponent() {
  // Access state
  const selectedTrack = useDashboardStore(state => state.selectedTrack);
  const selectedDrivers = useDashboardStore(state => state.selectedDrivers);
  
  // Access actions
  const setTrack = useDashboardStore(state => state.setTrack);
  const toggleDriver = useDashboardStore(state => state.toggleDriver);
  
  // Use in component
  return (
    <div>
      <button onClick={() => setTrack('barber_top10')}>
        Select Barber Track
      </button>
      <button onClick={() => toggleDriver(13)}>
        Toggle Driver 13
      </button>
    </div>
  );
}
```

### Track Selection

```typescript
// Load a track and its data
await useDashboardStore.getState().setTrack('barber_top10');

// Access loaded data
const { lapTimes, driverStats } = useDashboardStore.getState();
```

### Driver Selection

```typescript
// Toggle driver selection (max 5 drivers)
useDashboardStore.getState().toggleDriver(13);
useDashboardStore.getState().toggleDriver(22);

// Get selected drivers
const selectedDrivers = useDashboardStore.getState().selectedDrivers;
```

### Telemetry Loading

```typescript
// Load telemetry for a specific lap
await useDashboardStore.getState().loadLapTelemetry(13, 5);

// Access telemetry data
const telemetryData = useDashboardStore.getState().telemetryData;
const lap = telemetryData.get('13_5');
```

### Upload Lap

```typescript
// Upload a CSV file
const file = event.target.files[0];
await useDashboardStore.getState().uploadLap(file);

// Access uploaded lap
const uploadedLap = useDashboardStore.getState().uploadedLap;
```

### Export Data

```typescript
// Export currently displayed telemetry
useDashboardStore.getState().exportData();
```

### UI State Management

```typescript
// Set chart zoom
useDashboardStore.getState().setChartZoom({ startTime: 10, endTime: 50 });

// Toggle channel visibility
useDashboardStore.getState().toggleChannel('speed');

// Set theme
useDashboardStore.getState().setTheme('light');
```

## Store Structure

### State Properties

- `selectedTrack`: Currently selected track ID
- `trackManifest`: Root manifest with all track information
- `lapTimes`: Lap times for the selected track
- `driverStats`: Driver statistics for the selected track
- `selectedDrivers`: Array of selected driver numbers (max 5)
- `visibleChannels`: Array of visible telemetry channels
- `telemetryData`: Map of lap telemetry data (key: "driverNum_lapNum")
- `loadingStatus`: Map of loading status for each lap
- `uploadedLap`: User-uploaded lap data
- `chartZoom`: Current chart zoom state
- `theme`: Current theme ('dark' | 'light')

### Actions

- `setTrack(trackId)`: Load track data
- `toggleDriver(driverNumber)`: Toggle driver selection
- `loadLapTelemetry(driverNumber, lapNumber)`: Load lap telemetry
- `uploadLap(file)`: Upload and parse CSV file
- `exportData()`: Export telemetry to CSV
- `setChartZoom(zoom)`: Set chart zoom state
- `toggleChannel(channel)`: Toggle channel visibility
- `setTheme(theme)`: Set theme
- `clearUploadedLap()`: Clear uploaded lap
- `reset()`: Reset all state

## Requirements Covered

### Subtask 4.1 - Base Store Structure
- ✅ Initialize Zustand store with all state properties
- ✅ Implement `setTrack` action to load track data
- ✅ Implement `toggleDriver` action for driver selection
- ✅ Add state for selected track, drivers, and visible channels
- ✅ Requirements: 2.1, 2.2, 2.3, 2.4, 2.5

### Subtask 4.2 - Telemetry Data Management
- ✅ Create `loadLapTelemetry` action to fetch and store lap data
- ✅ Implement loading status tracking with progress updates
- ✅ Add telemetry data map with lap ID keys
- ✅ Requirements: 1.2, 1.3, 1.6

### Subtask 4.3 - Upload and Export
- ✅ Implement `uploadLap` action for CSV upload handling
- ✅ Implement `exportData` action to generate CSV downloads
- ✅ Add state for uploaded lap data
- ✅ Requirements: 5.1, 5.4, 8.1, 8.2, 8.4

## Notes

- The `loadLapTelemetry` action currently uses placeholder logic. It will be fully implemented in Task 6 (Web Worker for Data Processing) to handle actual compressed lap file fetching, decompression, and parsing.
- The store uses Zustand's create function for a lightweight, performant state management solution.
- All state updates are immutable to ensure proper React re-renders.
- The store follows the requirements specified in the design document.
