# Loading Skeleton Components

This directory contains loading skeleton components that provide visual feedback during data loading operations.

## Overview

Loading skeletons improve perceived performance by showing users that content is loading, rather than displaying blank spaces or generic spinners. They match the layout of the actual content, creating a smooth transition when data arrives.

## Requirements Met

- ✅ **14.3**: Add loading skeletons for summary cards, driver stats table, and charts
- ✅ **1.6**: Display loading indicators during telemetry data parsing
- ✅ **9.3**: Show progress indicators with percentage during data loading

## Components

### SummaryCardsSkeleton

Skeleton for the three summary cards at the top of the dashboard.

**Usage:**
```tsx
import { SummaryCardsSkeleton } from '@/components/skeletons';

{isLoading ? <SummaryCardsSkeleton /> : <SummaryCards data={data} />}
```

**Features:**
- Three card layout matching actual summary cards
- Animated pulse effect
- Responsive grid layout

### DriverStatsTableSkeleton

Skeleton for the driver statistics table (desktop/tablet view).

**Props:**
- `rows?: number` - Number of skeleton rows to display (default: 10)

**Usage:**
```tsx
import { DriverStatsTableSkeleton } from '@/components/skeletons';

{isLoading ? (
  <DriverStatsTableSkeleton rows={10} />
) : (
  <DriverStatsTable data={stats} />
)}
```

**Features:**
- Full table layout with header and rows
- 9-column grid matching actual table
- Staggered animation delays for visual interest
- Hover effects

### DriverStatsTableSkeletonCompact

Compact skeleton for mobile devices.

**Props:**
- `rows?: number` - Number of skeleton rows to display (default: 10)

**Usage:**
```tsx
import { DriverStatsTableSkeletonCompact } from '@/components/skeletons';

{isLoading ? (
  <DriverStatsTableSkeletonCompact rows={5} />
) : (
  <DriverStatsTableCompact data={stats} />
)}
```

**Features:**
- Simplified layout for small screens
- Two-line card format
- Optimized for mobile viewing

### ChartSkeleton

Skeleton for individual telemetry charts.

**Props:**
- `title?: string` - Chart title (default: "LOADING")
- `height?: number` - Height in pixels (default: 400)

**Usage:**
```tsx
import { ChartSkeleton } from '@/components/skeletons';

{isLoading ? (
  <ChartSkeleton title="SPEED" height={400} />
) : (
  <TelemetryChart channel="speed" data={data} />
)}
```

**Features:**
- Animated wave pattern simulating chart data
- Grid lines and axis labels
- Legend skeleton
- Loading indicator overlay
- Customizable height

### ChartsGridSkeleton

Skeleton for multiple charts in a grid layout.

**Props:**
- `count?: number` - Number of charts to show (default: 4)

**Usage:**
```tsx
import { ChartsGridSkeleton } from '@/components/skeletons';

{isLoading ? (
  <ChartsGridSkeleton count={4} />
) : (
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
    {/* Actual charts */}
  </div>
)}
```

**Features:**
- Responsive grid layout (1 column mobile, 2 columns desktop)
- Multiple chart skeletons with different titles
- Consistent spacing and sizing

## Design Principles

### Visual Consistency
- Skeletons match the exact layout of actual content
- Same spacing, padding, and dimensions
- Smooth transition when content loads

### Animation
- Subtle pulse animation (no jarring movements)
- Staggered delays for visual interest
- Consistent animation timing across components

### Accessibility
- Screen reader text for loading states
- Semantic HTML structure
- Proper ARIA labels

### Performance
- Lightweight CSS animations
- No JavaScript required for animations
- Minimal DOM elements

## Styling

All skeletons use the racing theme:
- Background: `#0b0b0b` (racing-bg)
- Skeleton elements: `#374151` (gray-700)
- Borders: `#1f2937` (gray-800)
- Accent: `#C8102E` (racing-red)

### Animation
```css
.animate-pulse {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
```

## Integration Examples

### Dashboard Layout
```tsx
function Dashboard() {
  const { isLoading, trackData, driverStats, telemetryData } = useDashboardData();
  
  return (
    <div className="dashboard">
      {/* Summary Cards */}
      {isLoading ? (
        <SummaryCardsSkeleton />
      ) : (
        <SummaryCards data={trackData} />
      )}
      
      {/* Driver Stats */}
      {isLoading ? (
        <DriverStatsTableSkeleton rows={10} />
      ) : (
        <DriverStatsTable data={driverStats} />
      )}
      
      {/* Charts */}
      {isLoading ? (
        <ChartsGridSkeleton count={4} />
      ) : (
        <TelemetryCharts data={telemetryData} />
      )}
    </div>
  );
}
```

### Progressive Loading
```tsx
function TelemetryView() {
  const { loadingStatus, telemetryData } = useTelemetry();
  
  return (
    <div className="grid grid-cols-2 gap-4">
      {['speed', 'throttle', 'steering', 'rpm'].map(channel => {
        const isLoading = loadingStatus[channel] === 'loading';
        
        return (
          <div key={channel}>
            {isLoading ? (
              <ChartSkeleton title={channel.toUpperCase()} />
            ) : (
              <TelemetryChart channel={channel} data={telemetryData[channel]} />
            )}
          </div>
        );
      })}
    </div>
  );
}
```

### Conditional Rendering
```tsx
function DataPanel() {
  const { isInitialLoad, isRefreshing, data } = useData();
  
  // Show skeleton only on initial load, not on refresh
  if (isInitialLoad) {
    return <SummaryCardsSkeleton />;
  }
  
  return (
    <>
      {isRefreshing && <RefreshIndicator />}
      <SummaryCards data={data} />
    </>
  );
}
```

## Testing

### Visual Testing
Run the demo component to see all skeletons:
```tsx
import { SkeletonDemo } from '@/components/skeletons/SkeletonDemo';

// In your app or storybook
<SkeletonDemo />
```

### Unit Testing
```tsx
import { render, screen } from '@testing-library/react';
import { ChartSkeleton } from '@/components/skeletons';

test('renders chart skeleton with title', () => {
  render(<ChartSkeleton title="SPEED" />);
  expect(screen.getByText('SPEED')).toBeInTheDocument();
});
```

## Best Practices

1. **Show Immediately**: Display skeletons as soon as loading starts
2. **Match Layout**: Ensure skeleton dimensions match actual content
3. **Smooth Transitions**: Use CSS transitions when swapping skeleton for content
4. **Responsive**: Use appropriate skeleton variants for different screen sizes
5. **Combine with Progress**: Show progress indicators for long operations
6. **Avoid Overuse**: Don't show skeletons for very fast operations (< 200ms)

## Performance Considerations

- Skeletons use CSS animations (GPU-accelerated)
- No JavaScript required for animation
- Minimal re-renders
- Lightweight DOM structure
- No external dependencies

## Browser Support

- Chrome/Edge: Full support
- Firefox: Full support
- Safari: Full support
- Mobile browsers: Full support

## Future Enhancements

- [ ] Add shimmer effect option
- [ ] Support dark/light theme variants
- [ ] Add more granular skeleton components
- [ ] Create skeleton generator utility
- [ ] Add Storybook stories

## Related Documentation

- [TelemetryChart Component](../TELEMETRY_CHART_USAGE.md)
- [SummaryCards Component](../SummaryCards.tsx)
- [DriverStatsTable Component](../DriverStatsTable.tsx)
- [Performance Optimizations](../../BUNDLE_OPTIMIZATION.md)
