/**
 * TelemetryChartGrid Component
 * 
 * Displays a grid of synchronized telemetry charts for all channels.
 * Manages zoom state synchronization across all charts.
 * 
 * Requirements:
 * - 3.1: Display synchronized charts for speed, throttle/brake, steering, RPM/gear
 * - 3.5: Synchronize x-axis across all charts during zoom and pan
 */

import React from 'react';
import { TelemetryChart } from './TelemetryChart';
import { useDashboardStore } from '../store/useDashboardStore';
import type { TelemetryChannel } from '../types/store';

// ============================================================================
// TelemetryChartGrid Component
// ============================================================================

export const TelemetryChartGrid: React.FC = () => {
  // Get state from store
  const {
    telemetryData,
    selectedLaps,
    uploadedLap,
    chartZoom,
    setChartZoom,
    loadingStatus,
    visibleChannels,
  } = useDashboardStore();
  
  // Define the channels to display (Requirement 3.1)
  const channels: TelemetryChannel[] = [
    'speed',
    'throttle',
    'steering',
    'rpm',
  ];
  
  // Filter channels based on visibility
  const displayedChannels = channels.filter(channel => 
    visibleChannels.includes(channel)
  );
  
  return (
    <div className="w-full h-full">
      {/* Chart Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 p-4">
        {displayedChannels.map((channel) => (
          <div
            key={channel}
            className="bg-[#0b0b0b] border border-gray-800 rounded-lg overflow-hidden"
          >
            <TelemetryChart
              channel={channel}
              data={telemetryData}
              selectedLaps={selectedLaps}
              uploadedLap={uploadedLap || undefined}
              zoomState={chartZoom}
              onZoomChange={setChartZoom}
              loadingStatus={loadingStatus}
            />
          </div>
        ))}
      </div>
      
      {/* Empty state */}
      {displayedChannels.length === 0 && (
        <div className="flex items-center justify-center h-full">
          <div className="text-center text-gray-400">
            <p className="text-lg font-mono">No channels selected</p>
            <p className="text-sm mt-2">Enable channels to view telemetry</p>
          </div>
        </div>
      )}
      
      {/* Zoom reset button */}
      {chartZoom && (
        <div className="fixed bottom-4 right-4 z-20">
          <button
            onClick={() => setChartZoom(null)}
            className="bg-[#C8102E] hover:bg-[#A00D24] text-white px-4 py-2 rounded-md font-mono text-sm transition-colors shadow-lg"
          >
            Reset Zoom
          </button>
        </div>
      )}
    </div>
  );
};

export default TelemetryChartGrid;
