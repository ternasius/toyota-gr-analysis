# Driver Selection Components Usage Guide

This document describes how to use the DriverMultiSelect and DriverStatsTable components.

## Components Overview

### DriverMultiSelect
A multi-select interface for choosing drivers with chip-based display.

**Features:**
- Limits selection to 5 drivers maximum
- Color-codes driver chips to match chart colors
- Sorts drivers by best lap time
- Search/filter functionality
- Visual feedback for selected drivers

**Usage:**
```tsx
import { DriverMultiSelect } from './components';

function MyComponent() {
  return <DriverMultiSelect />;
}
```

### DriverStatsTable
Displays comprehensive driver statistics in a responsive table.

**Features:**
- Shows: Driver, Best Lap, Avg Lap, StdDev, S1, S2, S3, Theoretical Best
- Highlights fastest value in each column with red color and award icon
- Clickable rows to select/deselect drivers
- Responsive layout (desktop table view, mobile card view)
- First place driver gets special highlighting

**Usage:**
```tsx
import { DriverStatsTable } from './components';

function MyComponent() {
  return <DriverStatsTable />;
}
```

## Integration Example

Both components are designed to work seamlessly with the Zustand store:

```tsx
import { DriverMultiSelect, DriverStatsTable } from './components';

function Sidebar() {
  return (
    <div className="space-y-4">
      <DriverMultiSelect />
      <DriverStatsTable />
    </div>
  );
}
```

## State Management

Both components automatically connect to the dashboard store:
- `driverStats` - Driver statistics from selected track
- `selectedDrivers` - Array of selected driver numbers
- `toggleDriver()` - Action to select/deselect drivers

## Styling

Components use the racing theme:
- Background: `#0b0b0b` (racing-bg)
- Accent: `#C8102E` (racing-red)
- Monospace font for lap times
- Bold, uppercase labels

## Driver Colors

The DriverMultiSelect uses a color palette for driver chips:
1. `#C8102E` - Toyota Red
2. `#00A3E0` - Blue
3. `#FFB81C` - Yellow
4. `#00B140` - Green
5. `#9B26B6` - Purple

These colors cycle for drivers beyond the 5th selection.

## Responsive Behavior

### DriverMultiSelect
- Adapts to container width
- Scrollable driver list (max-height: 24rem)
- Touch-friendly on mobile

### DriverStatsTable
- **Desktop (≥1024px)**: Full table with all columns
- **Mobile/Tablet (<1024px)**: Card-based layout with grouped stats
- Maintains all functionality across breakpoints

## Requirements Satisfied

### DriverMultiSelect
- ✅ 2.3: Multi-select interface for choosing drivers
- ✅ 2.4: Limit selection to 5 drivers maximum
- ✅ 2.5: Update visualization within 500ms (via Zustand)

### DriverStatsTable
- ✅ 4.2: Display comprehensive driver statistics
- ✅ 4.3: Highlight fastest value in each column
- ✅ 4.4: Clickable rows to select driver

## Next Steps

To integrate these components into the dashboard:

1. Add to DashboardLayout's left or right sidebar
2. Ensure track is selected (components show empty state otherwise)
3. Components will automatically update when track changes
4. Selected drivers will trigger telemetry loading (when implemented)
