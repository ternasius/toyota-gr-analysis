/**
 * TelemetryChart Demo Component
 * 
 * Demonstrates the TelemetryChart and TelemetryChartGrid components
 * with sample data for testing and development.
 */

import React, { useEffect } from 'react';
import { TelemetryChartGrid } from './TelemetryChartGrid';
import { useDashboardStore } from '../store/useDashboardStore';
import type { LapTelemetry, TelemetryPoint } from '../types/data';

/**
 * Generate sample telemetry data for testing
 */
function generateSampleTelemetry(driverNumber: number, lapNumber: number): LapTelemetry {
  const points: TelemetryPoint[] = [];
  const numPoints = 1000; // 100 seconds at 10Hz
  
  for (let i = 0; i < numPoints; i++) {
    const time = i * 0.1;
    const phase = (time / 10) * Math.PI * 2; // Complete cycle every 10 seconds
    
    points.push({
      vehicle_id: `GR86-${driverNumber.toString().padStart(3, '0')}-13`,
      meta_time: new Date(Date.now() + i * 100).toISOString(),
      timestamp: new Date(Date.now() + i * 100).toISOString(),
      lap: lapNumber,
      Laptrigger_lapdist_dls: i * 10,
      Steering_Angle: Math.sin(phase) * 180 + (Math.random() - 0.5) * 10,
      VBOX_Lat_Min: 33.5 + Math.random() * 0.01,
      VBOX_Long_Minutes: -86.6 + Math.random() * 0.01,
      accx_can: Math.sin(phase) * 0.5,
      accy_can: Math.cos(phase) * 0.8,
      aps: Math.max(0, Math.sin(phase) * 100),
      ath: null, // Not used in demo data
      gear: Math.floor(Math.abs(Math.sin(phase * 0.5)) * 5) + 1,
      nmot: 3000 + Math.abs(Math.sin(phase)) * 4000,
      pbrake_f: Math.max(0, -Math.sin(phase) * 50),
      pbrake_r: Math.max(0, -Math.sin(phase) * 30),
      speed: 100 + Math.sin(phase) * 80 + driverNumber * 2, // Slight variation per driver
      NUMBER: driverNumber,
      SOURCE_DIR: 'demo',
    });
  }
  
  return {
    driverNumber,
    lapNumber,
    points,
    sectors: [
      { sectorNumber: 1, startTime: 0, endTime: 33.3, duration: 33.3 },
      { sectorNumber: 2, startTime: 33.3, endTime: 66.6, duration: 33.3 },
      { sectorNumber: 3, startTime: 66.6, endTime: 100, duration: 33.4 },
    ],
    metadata: {
      duration: 100,
      maxSpeed: 180 + driverNumber * 2,
      avgSpeed: 140 + driverNumber,
    },
  };
}

/**
 * Demo component
 */
export const TelemetryChartDemo: React.FC = () => {
  const store = useDashboardStore();
  
  // Load sample data on mount
  useEffect(() => {
    // Generate sample telemetry for 3 drivers
    const sampleData = new Map<string, LapTelemetry>();
    
    [13, 22, 45].forEach(driverNumber => {
      const lapId = `${driverNumber}_1`;
      sampleData.set(lapId, generateSampleTelemetry(driverNumber, 1));
    });
    
    // Update store with sample data
    store.telemetryData.clear();
    sampleData.forEach((lap, lapId) => {
      store.telemetryData.set(lapId, lap);
    });
    
    // Select laps (demo uses lap 1 for each driver)
    if (store.selectedLaps.length === 0) {
      store.toggleLap(13, 1, 'demo');
      store.toggleLap(22, 1, 'demo');
    }
    
    // Force re-render
    store.setChartZoom(null);
  }, []);
  
  return (
    <div className="w-full h-screen bg-[#0b0b0b] p-4">
      <div className="mb-4">
        <h1 className="text-white text-2xl font-mono font-bold mb-2">
          Telemetry Chart Demo
        </h1>
        <p className="text-gray-400 text-sm font-mono">
          Sample telemetry data for drivers #13 and #22
        </p>
        
        {/* Lap selection buttons */}
        <div className="flex gap-2 mt-4">
          {[13, 22, 45].map(driverNum => {
            const isSelected = store.selectedLaps.some(lap => lap.driverNumber === driverNum);
            return (
              <button
                key={driverNum}
                onClick={() => store.toggleLap(driverNum, 1, 'demo')}
                className={`px-4 py-2 rounded font-mono text-sm transition-colors ${
                  isSelected
                    ? 'bg-[#C8102E] text-white'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                #{driverNum} L1
              </button>
            );
          })}
        </div>
      </div>
      
      <TelemetryChartGrid />
    </div>
  );
};

export default TelemetryChartDemo;
