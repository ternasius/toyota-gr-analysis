# Sector Analysis Implementation

## Overview

This document describes the sector analysis and visualization features implemented for the Race Telemetry Dashboard.

## Features Implemented

### 1. Sector Calculation Logic (Subtask 10.1)

**File**: `src/utils/sectorCalculator.ts`

The sector calculator provides utilities for dividing laps into 3 sectors based on driver statistics:

- **`calculateSectors()`**: Divides a lap into 3 sectors using S1Best, S2Best, and S3Best timing data from driver statistics
- **`findPointIndexAtTime()`**: Finds the telemetry point index closest to a given time using binary search
- **`getSectorPointRanges()`**: Calculates sector boundaries in terms of telemetry point indices
- **`calculateSectorDelta()`**: Computes time delta between two sectors
- **`getSectorDeltaColor()`**: Returns color code for delta visualization (green=faster, red=slower)
- **`formatSectorDelta()`**: Formats delta for display with sign and precision
- **`calculateActualSectorTimes()`**: Calculates actual sector times from telemetry data

**Integration**: Sectors are automatically calculated when loading lap telemetry in the store (`useDashboardStore.ts`).

### 2. Sector Markers on Charts (Subtask 10.2)

**File**: `src/components/TelemetryChart.tsx`

Visual sector markers are displayed on all telemetry charts:

- **Vertical lines** at sector boundaries (dotted gray lines)
- **Sector labels** (S1, S2, S3) positioned at the midpoint of each sector
- **Synchronized across all charts** - sector markers appear on speed, throttle/brake, steering, and RPM/gear charts
- **Responsive to zoom** - markers remain visible and properly positioned when zooming

### 3. Sector Delta Tooltips (Subtask 10.3)

**File**: `src/components/TelemetryChart.tsx`

Interactive sector delta information with hover functionality:

- **Hover detection**: Detects when user hovers over a sector region
- **Delta calculation**: Computes time delta vs fastest lap for each sector
- **Color-coded deltas**: 
  - Green (#00FF88) for faster than reference
  - Red (#FF006E) for slower than reference
  - Gray (#888888) for approximately equal
- **Sector highlighting**: Highlights the hovered sector region with a semi-transparent overlay
- **Tooltip display**: Shows detailed sector information including:
  - Sector number
  - Current sector time
  - Delta vs reference lap
  - Reference lap sector time

## Usage

### In Store

Sectors are automatically calculated when loading lap telemetry:

```typescript
// Sectors are calculated and stored with lap data
const { driverStats } = get();
const driverStat = driverStats.find(stat => stat.NUMBER === driverNumber);
const sectors = driverStat ? calculateSectors(lap, driverStat) : [];
```

### In TelemetryChart Component

Pass sector markers to the chart component:

```typescript
<TelemetryChart
  channel="speed"
  data={telemetryData}
  selectedDrivers={selectedDrivers}
  sectorMarkers={lap.sectors}  // Pass sectors from lap data
  showSectorDeltas={true}       // Enable delta tooltips
  // ... other props
/>
```

## Data Flow

1. **Load Track**: Driver statistics (including S1Best, S2Best, S3Best) are loaded
2. **Select Driver**: Lap telemetry is fetched
3. **Calculate Sectors**: Sectors are calculated using driver stats and stored with lap data
4. **Display Markers**: Vertical lines and labels are drawn on charts
5. **Hover Interaction**: User hovers over chart, sector is detected, delta is calculated and displayed

## Requirements Satisfied

- ✅ **Requirement 10.1**: Divide laps into 3 sectors based on S1Best, S2Best, S3Best timing data
- ✅ **Requirement 10.2**: Display vertical lines at sector boundaries with labels
- ✅ **Requirement 10.3**: Calculate time delta for each sector vs fastest lap
- ✅ **Requirement 10.4**: Highlight sector region on hover
- ✅ **Requirement 10.5**: Color-code deltas (green=faster, red=slower)

## Technical Details

### Sector Boundary Calculation

Sectors are calculated as cumulative time points:
- Sector 1: 0 to S1Best
- Sector 2: S1Best to (S1Best + S2Best)
- Sector 3: (S1Best + S2Best) to (S1Best + S2Best + S3Best)

### Performance Considerations

- Binary search for efficient point lookup in large datasets
- Memoized calculations to avoid redundant computations
- Debounced hover events to prevent excessive re-renders
- Sector data cached with lap telemetry in IndexedDB

### Visual Design

- Racing aesthetic maintained with dark theme and Toyota red accents
- Monospace fonts for timing data
- Semi-transparent overlays for sector highlighting
- Clear visual hierarchy with color-coded deltas

## Future Enhancements

Potential improvements for future iterations:

1. **Sector-by-sector comparison**: Compare multiple drivers' sector times side-by-side
2. **Sector heatmap**: Visual representation of sector performance across all laps
3. **Theoretical best lap**: Calculate and display theoretical best lap from best sectors
4. **Sector speed traps**: Show max/min speeds within each sector
5. **Sector-specific telemetry analysis**: Deep dive into specific sector performance
