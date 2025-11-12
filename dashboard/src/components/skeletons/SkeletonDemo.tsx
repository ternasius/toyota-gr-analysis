/**
 * Skeleton Components Demo
 * 
 * Demonstrates usage of loading skeleton components.
 * This file serves as both documentation and a visual reference.
 * 
 * Requirements: 14.3, 1.6, 9.3
 */

import React, { useState } from 'react';
import {
  SummaryCardsSkeleton,
  DriverStatsTableSkeleton,
  DriverStatsTableSkeletonCompact,
  ChartSkeleton,
  ChartsGridSkeleton,
} from './index';

/**
 * Demo component showing all skeleton variations
 */
export const SkeletonDemo: React.FC = () => {
  const [showSkeletons, setShowSkeletons] = useState(true);

  return (
    <div className="min-h-screen bg-[#0b0b0b] p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Loading Skeletons Demo</h1>
          <p className="text-gray-400">
            Visual reference for all loading skeleton components
          </p>
          
          {/* Toggle button */}
          <button
            onClick={() => setShowSkeletons(!showSkeletons)}
            className="mt-4 px-4 py-2 bg-[#C8102E] text-white rounded-md hover:bg-[#A00D24] transition-colors"
          >
            {showSkeletons ? 'Hide Skeletons' : 'Show Skeletons'}
          </button>
        </div>

        {showSkeletons && (
          <div className="space-y-12">
            {/* Summary Cards Skeleton */}
            <section>
              <h2 className="text-xl font-bold text-white mb-4">Summary Cards Skeleton</h2>
              <p className="text-gray-400 mb-4 text-sm">
                Used while loading track summary data (fastest lap, average top 10, track conditions)
              </p>
              <SummaryCardsSkeleton />
            </section>

            {/* Driver Stats Table Skeleton - Desktop */}
            <section>
              <h2 className="text-xl font-bold text-white mb-4">Driver Stats Table Skeleton (Desktop)</h2>
              <p className="text-gray-400 mb-4 text-sm">
                Used while loading driver statistics table on desktop/tablet
              </p>
              <DriverStatsTableSkeleton rows={5} />
            </section>

            {/* Driver Stats Table Skeleton - Mobile */}
            <section>
              <h2 className="text-xl font-bold text-white mb-4">Driver Stats Table Skeleton (Mobile)</h2>
              <p className="text-gray-400 mb-4 text-sm">
                Compact version for mobile devices
              </p>
              <div className="max-w-md">
                <DriverStatsTableSkeletonCompact rows={5} />
              </div>
            </section>

            {/* Single Chart Skeleton */}
            <section>
              <h2 className="text-xl font-bold text-white mb-4">Single Chart Skeleton</h2>
              <p className="text-gray-400 mb-4 text-sm">
                Used while loading individual telemetry charts
              </p>
              <ChartSkeleton title="SPEED" height={400} />
            </section>

            {/* Charts Grid Skeleton */}
            <section>
              <h2 className="text-xl font-bold text-white mb-4">Charts Grid Skeleton</h2>
              <p className="text-gray-400 mb-4 text-sm">
                Used while loading multiple charts in grid layout
              </p>
              <ChartsGridSkeleton count={4} />
            </section>
          </div>
        )}

        {/* Usage Examples */}
        <section className="mt-12 bg-gray-900 rounded-lg p-6">
          <h2 className="text-xl font-bold text-white mb-4">Usage Examples</h2>
          
          <div className="space-y-6">
            {/* Example 1 */}
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">1. Summary Cards</h3>
              <pre className="bg-black p-4 rounded-md overflow-x-auto">
                <code className="text-sm text-gray-300">{`import { SummaryCardsSkeleton } from '@/components/skeletons';

function Dashboard() {
  const { isLoading, trackData } = useTrackData();
  
  return (
    <>
      {isLoading ? (
        <SummaryCardsSkeleton />
      ) : (
        <SummaryCards data={trackData} />
      )}
    </>
  );
}`}</code>
              </pre>
            </div>

            {/* Example 2 */}
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">2. Driver Stats Table</h3>
              <pre className="bg-black p-4 rounded-md overflow-x-auto">
                <code className="text-sm text-gray-300">{`import { DriverStatsTableSkeleton } from '@/components/skeletons';

function StatsPanel() {
  const { isLoading, driverStats } = useDriverStats();
  
  return (
    <>
      {isLoading ? (
        <DriverStatsTableSkeleton rows={10} />
      ) : (
        <DriverStatsTable data={driverStats} />
      )}
    </>
  );
}`}</code>
              </pre>
            </div>

            {/* Example 3 */}
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">3. Telemetry Charts</h3>
              <pre className="bg-black p-4 rounded-md overflow-x-auto">
                <code className="text-sm text-gray-300">{`import { ChartSkeleton } from '@/components/skeletons';

function TelemetryPanel() {
  const { isLoading, telemetryData } = useTelemetry();
  
  return (
    <>
      {isLoading ? (
        <ChartSkeleton title="SPEED" height={400} />
      ) : (
        <TelemetryChart channel="speed" data={telemetryData} />
      )}
    </>
  );
}`}</code>
              </pre>
            </div>

            {/* Example 4 */}
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">4. Multiple Charts Grid</h3>
              <pre className="bg-black p-4 rounded-md overflow-x-auto">
                <code className="text-sm text-gray-300">{`import { ChartsGridSkeleton } from '@/components/skeletons';

function ChartsView() {
  const { isLoading, telemetryData } = useTelemetry();
  
  return (
    <>
      {isLoading ? (
        <ChartsGridSkeleton count={4} />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <TelemetryChart channel="speed" data={telemetryData} />
          <TelemetryChart channel="throttle" data={telemetryData} />
          <TelemetryChart channel="steering" data={telemetryData} />
          <TelemetryChart channel="rpm" data={telemetryData} />
        </div>
      )}
    </>
  );
}`}</code>
              </pre>
            </div>
          </div>
        </section>

        {/* Best Practices */}
        <section className="mt-8 bg-gray-900 rounded-lg p-6">
          <h2 className="text-xl font-bold text-white mb-4">Best Practices</h2>
          <ul className="space-y-2 text-gray-300">
            <li className="flex items-start gap-2">
              <span className="text-[#C8102E] mt-1">•</span>
              <span>Show skeletons immediately when loading starts (don't wait for spinners)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#C8102E] mt-1">•</span>
              <span>Match skeleton dimensions to actual content for smooth transitions</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#C8102E] mt-1">•</span>
              <span>Use appropriate skeleton variants for different screen sizes</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#C8102E] mt-1">•</span>
              <span>Keep skeleton animations subtle (pulse effect is sufficient)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#C8102E] mt-1">•</span>
              <span>Combine skeletons with progress indicators for long operations</span>
            </li>
          </ul>
        </section>
      </div>
    </div>
  );
};

export default SkeletonDemo;
