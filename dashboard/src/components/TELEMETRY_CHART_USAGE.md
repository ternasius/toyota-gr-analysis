# Telemetry Chart Components

This document describes the usage of the TelemetryChart and TelemetryChartGrid components for visualizing race telemetry data.

## Components

### TelemetryChart

The base chart component that displays a single telemetry channel (speed, throttle/brake, steering, RPM/gear) with support for multiple drivers, zoom/pan interactions, and progressive rendering.

**Features:**
- ✅ Multiple driver traces with color coding
- ✅ Drag-to-zoom functionality
- ✅ Pan on zoomed charts
- ✅ Double-click to reset zoom
- ✅ Synchronized x-axis across all chart instances
- ✅ Hover tooltips with exact values and delta calculations
- ✅ Clickable legend to toggle driver visibility
- ✅ Progressive rendering with loading indicators
- ✅ Support for uploaded lap comparison (dashed lines)
- ✅ Dual y-axis support for combined charts (e.g., RPM/gear)

**Props:**

```typescript
interface TelemetryChartProps {
  channel: TelemetryChannel;                    // 'speed' | 'throttle' | 'brake' | 'steering' | 'rpm' | 'gear'
  data: Map<string, LapTelemetry>;              // Map of lap data keyed by "driverNum_lapNum"
  selectedDrivers: number[];                     // Array of selected driver numbers
  uploadedLap?: LapTelemetry;                   // Optional uploaded lap for comparison
  zoomState?: ZoomState | null;                 // Current zoom state (null = no zoom)
  onZoomChange?: (zoom: ZoomState | null) => void; // Callback when zoom changes
  loadingStatus?: Map<string, LoadingProgress>; // Loading status for each driver
}
```

**Example Usage:**

```tsx
import { TelemetryChart } from './components/TelemetryChart';
import { useDashboardStore } from './store/useDashboardStore';

function MyComponent() {
  const { telemetryData, selectedDrivers, chartZoom, setChartZoom } = useDashboardStore();
  
  return (
    <TelemetryChart
      channel="speed"
      data={telemetryData}
      selectedDrivers={selectedDrivers}
      zoomState={chartZoom}
      onZoomChange={setChartZoom}
    />
  );
}
```

### TelemetryChartGrid

A grid layout component that displays multiple synchronized telemetry charts. Automatically manages zoom state synchronization across all charts.

**Features:**
- ✅ Displays 4 main charts: Speed, Throttle/Brake, Steering, RPM/Gear
- ✅ Synchronized zoom across all charts
- ✅ Responsive grid layout (2x2 on desktop, stacked on mobile)
- ✅ Global zoom reset button
- ✅ Integrates with Zustand store

**Example Usage:**

```tsx
import { TelemetryChartGrid } from './components/TelemetryChartGrid';

function Dashboard() {
  return (
    <div className="w-full h-full">
      <TelemetryChartGrid />
    </div>
  );
}
```

## Channel Configurations

### Speed
- **Fields:** `speed` (km/h)
- **Color:** Toyota Red (#C8102E)

### Throttle/Brake (Combined)
- **Fields:** `aps` (throttle %), `pbrake_f` (front brake bar), `pbrake_r` (rear brake bar)
- **Colors:** Green (#00FF88), Pink (#FF006E), Orange (#FF6B35)

### Steering
- **Fields:** `Steering_Angle` (degrees)
- **Color:** Cyan (#00D9FF)

### RPM/Gear (Combined with dual y-axis)
- **Fields:** `nmot` (RPM), `gear`
- **Colors:** Gold (#FFD700), Purple (#9D4EDD)
- **Note:** Uses dual y-axis with RPM on left, gear on right

## Interactions

### Zoom
- **Drag to zoom:** Click and drag to select a region
- **Scroll wheel:** Zoom in/out at cursor position
- **Double-click:** Reset zoom to full view
- **Zoom reset button:** Global reset button appears when zoomed

### Pan
- **Drag:** When zoomed, drag to pan left/right
- **Synchronized:** All charts pan together

### Legend
- **Single click:** Toggle trace visibility
- **Double click:** Isolate trace (hide all others)

### Hover
- **Unified hover:** All traces show values at the same x-position
- **Delta calculations:** Shows difference vs fastest driver
- **Format:** Time, value, and delta (if applicable)

## Progressive Rendering

Charts support progressive rendering for large datasets:

1. **Loading indicator:** Shows progress percentage while data loads
2. **Incremental updates:** Charts update as data chunks arrive from Web Worker
3. **Priority rendering:** Speed channel prioritized for fastest display
4. **Smooth transitions:** Plotly.react ensures efficient updates

## Styling

Charts follow the racing aesthetic:
- **Background:** Near-black (#0b0b0b)
- **Accent:** Toyota Red (#C8102E)
- **Grid:** Dark gray (#333333)
- **Text:** White with monospace font
- **Titles:** Bold, all-caps

## Performance Considerations

- **Downsampling:** Data is downsampled to 500-2000 points using LTTB algorithm (handled by Web Worker)
- **Debouncing:** Zoom/pan events debounced to 100ms for smooth performance
- **Memoization:** Traces and layout memoized to prevent unnecessary recalculations
- **Efficient updates:** Plotly.react used for incremental updates

## Requirements Mapping

This implementation satisfies the following requirements:

- **3.1:** Display synchronized charts for speed, throttle/brake, steering, RPM/gear ✅
- **3.2:** Support zoom operations via drag-select ✅
- **3.3:** Support pan operations on zoomed charts ✅
- **3.4:** Double-click to reset zoom ✅
- **3.5:** Synchronize x-axis across all charts ✅
- **3.6:** Display hover tooltips with exact values and deltas ✅
- **3.7:** Allow toggling driver visibility via legend ✅
- **3.8:** Downsample telemetry data using LTTB algorithm ✅
- **5.5:** Render uploaded lap with dashed line style ✅
- **9.1:** Progressive rendering with loading indicators ✅
- **9.2:** Update charts incrementally as data chunks arrive ✅
- **9.3:** Show progress indicator with percentage ✅
- **9.4:** Prioritize speed channel rendering ✅

## Demo

A demo component is available for testing:

```tsx
import { TelemetryChartDemo } from './components/TelemetryChartDemo';

// Generates sample telemetry data and displays charts
<TelemetryChartDemo />
```

## Integration with Store

The components integrate seamlessly with the Zustand store:

```typescript
// Store provides:
- telemetryData: Map<string, LapTelemetry>
- selectedDrivers: number[]
- uploadedLap: LapTelemetry | null
- chartZoom: ZoomState | null
- setChartZoom: (zoom: ZoomState | null) => void
- loadingStatus: Map<string, LoadingProgress>
- visibleChannels: TelemetryChannel[]
```

## Future Enhancements

Potential improvements for future iterations:

1. **Sector markers:** Vertical lines showing sector boundaries
2. **Delta visualization:** Color-coded regions showing time gained/lost
3. **Track map overlay:** Minimap showing current position
4. **Comparison mode:** Side-by-side comparison of two laps
5. **Export charts:** Save charts as images
6. **Custom channels:** User-defined channel combinations
7. **Annotations:** Add notes/markers to specific points
8. **Video sync:** Overlay telemetry on onboard video

## Troubleshooting

### Charts not displaying
- Ensure telemetry data is loaded in the store
- Check that drivers are selected
- Verify data format matches TelemetryPoint interface

### Zoom not synchronizing
- Ensure all charts use the same `zoomState` prop
- Verify `onZoomChange` callback is updating store

### Performance issues
- Check data is downsampled (should be < 2000 points)
- Verify Web Worker is processing data
- Consider reducing number of visible channels

### TypeScript errors
- Ensure Plotly types are installed: `@types/plotly.js`
- Check that all props match interface definitions
