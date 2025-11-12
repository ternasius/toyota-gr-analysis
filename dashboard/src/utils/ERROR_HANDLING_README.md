# Error Handling Implementation

This document describes the error handling system implemented for the Race Telemetry Dashboard.

## Overview

The error handling system consists of four main components:

1. **Toast Notification System** - For temporary user notifications
2. **Error Boundaries** - For catching React component errors
3. **Missing Telemetry Handling** - For gracefully handling unavailable data
4. **Data Quirks Handler** - For handling known data issues

## 1. Toast Notification System

### Components

- **`Toast.tsx`** - Individual toast notification component
- **`ToastContainer.tsx`** - Container for managing all active toasts
- **`useToastStore.ts`** - Zustand store for toast state management
- **`useToast.ts`** - Convenience hook for showing toasts

### Usage

```typescript
import { useToast } from '../hooks/useToast';

function MyComponent() {
  const { showError, showNetworkError, showSuccess } = useToast();
  
  // Show a generic error
  showError('Something went wrong');
  
  // Show a network error with retry button
  showNetworkError('Failed to fetch data', () => {
    // Retry logic
  });
  
  // Show a success message
  showSuccess('Data loaded successfully');
}
```

### Features

- Auto-dismisses after 5 seconds (configurable)
- Network errors include retry button
- Animated slide-in from right
- Color-coded by type (success, error, warning, info)
- Accessible with ARIA labels

## 2. Error Boundaries

### Component

- **`ErrorBoundary.tsx`** - React Error Boundary component

### Usage

```typescript
import { ErrorBoundary } from './components/ErrorBoundary';

function App() {
  return (
    <ErrorBoundary>
      <YourComponents />
    </ErrorBoundary>
  );
}
```

### Features

- Catches React component errors
- Displays fallback UI with error details
- Logs errors to console
- Provides "Try Again" and "Reload Page" buttons
- Shows stack trace in development mode

## 3. Missing Telemetry Handling

### Components & Utilities

- **`MissingTelemetryMessage.tsx`** - Inline message for missing data
- **`telemetryHelpers.ts`** - Utilities for checking data availability

### Usage

```typescript
import { isTelemetryAvailable, hasFieldData } from '../utils/telemetryHelpers';
import { MissingTelemetryMessage } from './MissingTelemetryMessage';

function TelemetryView({ lap, lapTimes }) {
  if (!isTelemetryAvailable(lap)) {
    return (
      <MissingTelemetryMessage
        driverNumber={lap.driverNumber}
        lapNumber={lap.lapNumber}
        availableLaps={lapTimes}
        onSelectLap={(lapNum) => {
          // Load alternative lap
        }}
      />
    );
  }
  
  // Render telemetry...
}
```

### Features

- Checks if telemetry data is available
- Suggests alternative laps with available data
- Displays lap times even when telemetry is unavailable
- Continues rendering other selected drivers
- Handles null values gracefully (interpolate or skip)

## 4. Data Quirks Handler

### Utility

- **`dataQuirks.ts`** - Handles known data issues from notes.txt

### Known Issues Handled

1. **Erroneous Lap Numbers**
   - Lap field sometimes shows 32768 when lost
   - Filtered out automatically in `parseLapTimes()` and `parseTelemetry()`

2. **Unreliable Timestamps**
   - ECU timestamp may not be accurate
   - Falls back to `meta_time` (message received time)
   - Handled by `getBestTimestamp()`

3. **Null Values in Telemetry Fields**
   - Many fields can be null/empty
   - Critical fields (speed, steering) are interpolated
   - Optional fields (GPS, acceleration) allow null
   - Handled by `interpolateMissingValues()`

4. **Sebring Track Format**
   - Different format, limited availability
   - Warning displayed via `TrackWarning` component
   - Detected by `isSebringStrack()`

### Usage

```typescript
import { 
  filterValidLapTimes, 
  cleanTelemetryPoints,
  getBestTimestamp,
  isSebringStrack 
} from '../utils/dataQuirks';

// Filter out erroneous lap numbers
const validLaps = filterValidLapTimes(lapTimes);

// Clean telemetry data
const cleanedPoints = cleanTelemetryPoints(telemetryPoints);

// Get best timestamp
const timestamp = getBestTimestamp(point);

// Check for Sebring
if (isSebringStrack(trackId)) {
  // Show warning
}
```

### Integration

The data quirk handlers are automatically integrated into:

- **CSV Parser** (`csvParser.ts`)
  - `parseLapTimes()` filters erroneous lap numbers
  - `parseTelemetry()` cleans telemetry points

- **Store** (`useDashboardStore.ts`)
  - Handles missing data gracefully
  - Continues operation even with partial data

## Error Flow Examples

### Network Error Flow

1. User selects a track
2. `fetchTrackData()` fails with network error
3. Component catches error and calls `showNetworkError()`
4. Toast appears with retry button
5. User clicks retry
6. Request is retried with exponential backoff

### Missing Telemetry Flow

1. User selects a driver
2. `loadLapTelemetry()` returns empty/null data
3. `isTelemetryAvailable()` returns false
4. `MissingTelemetryMessage` component is displayed
5. Component suggests alternative laps
6. User can select alternative lap or continue viewing lap times

### Component Error Flow

1. React component throws error during render
2. `ErrorBoundary` catches error
3. Error is logged to console
4. Fallback UI is displayed
5. User can try again or reload page

## Best Practices

1. **Always use toast notifications for user-facing errors**
   ```typescript
   try {
     await fetchData();
   } catch (error) {
     showError(error);
   }
   ```

2. **Wrap major component sections in ErrorBoundary**
   ```typescript
   <ErrorBoundary>
     <CriticalComponent />
   </ErrorBoundary>
   ```

3. **Check data availability before rendering**
   ```typescript
   if (!isTelemetryAvailable(lap)) {
     return <MissingTelemetryMessage />;
   }
   ```

4. **Use data quirk utilities in parsers**
   ```typescript
   const points = parseTelemetry(csv); // Automatically cleaned
   ```

## Requirements Coverage

- ✅ **7.1** - Toast notifications for network errors with retry button
- ✅ **7.2** - Display lap times even when telemetry unavailable
- ✅ **7.3** - Error boundaries with fallback UI and console logging
- ✅ **7.4** - Toast notifications for worker errors
- ✅ **7.5** - Handle data quirks:
  - Filter erroneous lap numbers (32768)
  - Use meta_time as fallback
  - Handle null values (interpolate or skip)
  - Display warning for Sebring track

## Testing

To test error handling:

1. **Toast Notifications**
   - Disconnect network and try loading data
   - Upload invalid CSV file
   - Trigger worker errors

2. **Error Boundaries**
   - Throw error in component render
   - Check fallback UI appears
   - Verify console logging

3. **Missing Telemetry**
   - Select driver with no telemetry
   - Verify message appears
   - Check alternative laps are suggested

4. **Data Quirks**
   - Load data with lap number 32768
   - Check invalid timestamps are handled
   - Load Sebring track and verify warning
