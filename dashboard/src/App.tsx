/**
 * App Component
 * 
 * Main application shell for the Race Telemetry Dashboard.
 * Sets up the layout structure with navbar, summary cards, sidebars, and main content area.
 * Wires all components to Zustand store for complete data flow.
 * 
 * Requirements: 6.5, 6.6 (Responsive design with breakpoints)
 * Task 19.1: Connect all components together
 */

import { useMemo, useState, useEffect } from 'react';
import { DashboardLayout } from './components/DashboardLayout';
import { Navbar } from './components/Navbar';
import { SummaryCards } from './components/SummaryCards';
import { LapTimeSelector } from './components/LapTimeSelector';
import { DriverStatsTable } from './components/DriverStatsTable';
import { TelemetryChart } from './components/TelemetryChart';
import { DeltaDisplay } from './components/DeltaDisplay';
import { ToastContainer } from './components/ToastContainer';
import { ErrorBoundary } from './components/ErrorBoundary';
import { LiveRegion } from './components/LiveRegion';
import { KeyboardShortcutsHelp } from './components/KeyboardShortcutsHelp';
import { useDashboardStore } from './store/useDashboardStore';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { performanceMonitor } from './utils/performanceMonitor';
import type { LapTelemetry } from './types/data';
import type { TelemetryChannel } from './types/store';

function App() {
  const {
    uploadedLap,
    selectedLaps,
    telemetryData,
    liveRegionMessage,
    chartZoom,
    setChartZoom,
    loadingStatus,
  } = useDashboardStore();
  
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);

  // Load manifest on app start
  useEffect(() => {
    const initializeApp = async () => {
      try {
        performanceMonitor.startMark('initial-load');
        
        // Load the root manifest to populate track dropdown
        const { loadRootManifest } = await import('./utils/manifestLoader');
        const manifest = await loadRootManifest();
        
        // Update store with manifest
        useDashboardStore.setState({ trackManifest: manifest });
        
        performanceMonitor.endMark('initial-load');
        performanceMonitor.checkRequirement('initial-load', 2000);
        
        if (import.meta.env.DEV) {
          performanceMonitor.logSummary();
        }
      } catch (error) {
        console.error('Failed to load manifest:', error);
      }
    };
    
    initializeApp();
  }, []);

  // Global keyboard shortcuts (Requirement 16.2)
  useKeyboardShortcuts([
    {
      key: '?',
      shift: true,
      action: () => setShowKeyboardHelp(true),
      description: 'Show keyboard shortcuts',
    },
  ]);

  // Find reference lap (fastest selected lap) for delta comparison
  const referenceLap = useMemo((): { lap: LapTelemetry; driverNumber: number } | null => {
    if (selectedLaps.length === 0) return null;

    let fastestLap: LapTelemetry | null = null;
    let fastestDriver: number | null = null;
    let minDuration = Infinity;

    selectedLaps.forEach(({ driverNumber, lapNumber, sourceDir }) => {
      const lapId = `${driverNumber}_${lapNumber}_${sourceDir}`;
      const lap = telemetryData.get(lapId);
      if (
        lap &&
        lap.metadata.duration > 0 &&
        lap.metadata.duration < minDuration
      ) {
        minDuration = lap.metadata.duration;
        fastestLap = lap;
        fastestDriver = driverNumber;
      }
    });

    if (fastestLap && fastestDriver !== null) {
      return { lap: fastestLap, driverNumber: fastestDriver };
    }

    return null;
  }, [selectedLaps, telemetryData]);

  // Calculate sector markers from reference lap
  const sectorMarkers = useMemo(() => {
    if (!referenceLap || !referenceLap.lap.sectors || referenceLap.lap.sectors.length === 0) {
      return undefined;
    }
    return referenceLap.lap.sectors;
  }, [referenceLap]);

  // Telemetry data is now auto-loaded when laps are selected via toggleLap
  // No need for separate effect here since loadLapTelemetry is called in toggleLap

  // Define telemetry channels to display (Requirement 3.1)
  // Separated charts for better visibility
  const telemetryChannels: TelemetryChannel[] = ['speed', 'throttle', 'brake', 'steering', 'rpm', 'gear'];

  return (
    <>
      {/* Skip to main content link for keyboard navigation (Requirement 16.2) */}
      <a href="#main-content" className="skip-to-main">
        Skip to main content
      </a>
      
      <ToastContainer />
      <LiveRegion message={liveRegionMessage} />
      <KeyboardShortcutsHelp 
        isOpen={showKeyboardHelp} 
        onClose={() => setShowKeyboardHelp(false)} 
      />
      <ErrorBoundary>
        <DashboardLayout
          navbar={<Navbar />}
          summaryCards={<SummaryCards />}
          leftSidebar={
            <aside className="p-4 space-y-4 slide-in-left" aria-label="Lap time selection">
              <LapTimeSelector />
            </aside>
          }
          mainContent={
            <main id="main-content" aria-label="Telemetry charts" tabIndex={-1} className="p-4 space-y-4">
              {selectedLaps.length === 0 ? (
                <div className="flex items-center justify-center h-full min-h-[400px] fade-in">
                  <div className="text-center text-gray-400">
                    <p className="text-lg telemetry-label mb-2">NO DRIVERS SELECTED</p>
                    <p className="text-sm">Select drivers from the sidebar to view telemetry</p>
                  </div>
                </div>
              ) : (
                <>
                  {telemetryChannels.map((channel, index) => (
                    <div 
                      key={channel} 
                      className="card-racing rounded-lg p-4 fade-in"
                      style={{ animationDelay: `${index * 0.1}s` }}
                    >
                      <TelemetryChart
                        channel={channel}
                        data={telemetryData}
                        selectedLaps={selectedLaps}
                        uploadedLap={uploadedLap || undefined}
                        zoomState={chartZoom}
                        onZoomChange={setChartZoom}
                        loadingStatus={loadingStatus}
                        sectorMarkers={sectorMarkers}
                        showSectorDeltas={true}
                      />
                    </div>
                  ))}
                </>
              )}
            </main>
          }
          rightSidebar={
            <aside className="p-4 space-y-4 slide-in-right" aria-label="Statistics and analysis">
              {uploadedLap && referenceLap ? (
                <div className="space-y-4 fade-in">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg telemetry-label text-white">
                      UPLOADED LAP ANALYSIS
                    </h2>
                    <button
                      onClick={() => useDashboardStore.getState().clearUploadedLap()}
                      className="text-xs text-gray-400 hover:text-racing-red hover-racing min-w-[44px] min-h-[44px]"
                      aria-label="Clear uploaded lap"
                    >
                      Clear
                    </button>
                  </div>
                  <DeltaDisplay
                    uploadedLap={uploadedLap}
                    referenceLap={referenceLap.lap}
                    referenceDriverNumber={referenceLap.driverNumber}
                  />
                  <div className="border-t border-gray-800 pt-4">
                    <DriverStatsTable />
                  </div>
                </div>
              ) : (
                <DriverStatsTable />
              )}
            </aside>
          }
        />
      </ErrorBoundary>
    </>
  );
}

export default App;
