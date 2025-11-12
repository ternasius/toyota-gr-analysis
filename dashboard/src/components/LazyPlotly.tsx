/**
 * Lazy Plotly Loader
 * 
 * Dynamically imports Plotly.js to reduce initial bundle size.
 * Shows a loading indicator while Plotly is being loaded.
 * 
 * Requirements: 14.2 - Optimize bundle size with lazy loading
 */

import React, { Suspense, lazy } from 'react';

// Lazy load the TelemetryChart component which imports Plotly
const TelemetryChartLazy = lazy(() => import('./TelemetryChart'));

/**
 * Loading fallback component shown while Plotly is loading
 */
const PlotlyLoadingFallback: React.FC = () => (
  <div className="w-full h-full min-h-[400px] flex items-center justify-center bg-[#0b0b0b]">
    <div className="flex flex-col items-center gap-4">
      <div className="w-12 h-12 border-4 border-[#C8102E] border-t-transparent rounded-full animate-spin" />
      <div className="text-white font-mono text-sm">Loading chart library...</div>
    </div>
  </div>
);

/**
 * Lazy-loaded TelemetryChart wrapper
 * 
 * This component wraps the TelemetryChart with React.lazy and Suspense
 * to enable code splitting and reduce the initial bundle size.
 * 
 * Plotly.js is ~3MB, so lazy loading it significantly improves initial load time.
 */
export const LazyTelemetryChart: React.FC<React.ComponentProps<typeof TelemetryChartLazy>> = (props) => {
  return (
    <Suspense fallback={<PlotlyLoadingFallback />}>
      <TelemetryChartLazy {...props} />
    </Suspense>
  );
};

export default LazyTelemetryChart;
