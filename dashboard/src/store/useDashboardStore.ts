/**
 * Dashboard Store
 * 
 * Zustand store for managing the Race Telemetry Dashboard state.
 * Handles track selection, driver selection, telemetry data loading,
 * uploads, and exports.
 */

import { create } from 'zustand';
import type { DashboardStore, TelemetryChannel } from '../types/store';
import { loadRootManifest } from '../utils/manifestLoader';
import { fetchTrackData } from '../utils/dataFetcher';
import { parseTelemetry } from '../utils/csvParser';
import { getCachedLap, setCachedLap } from '../utils/cache';
import type { LapTelemetry } from '../types/data';
import { config } from '../config';
import { calculateSectors } from '../utils/sectorCalculator';
import { exportTelemetryData, exportDriverStats } from '../utils/exportUtils';
import { performanceMonitor } from '../utils/performanceMonitor';

/**
 * Initial state for the dashboard store
 */
const initialState = {
  // Track state
  selectedTrack: null,
  trackManifest: null,
  lapTimes: [],
  driverStats: [],
  
  // Selection state
  selectedLaps: [],
  visibleChannels: ['speed', 'throttle', 'brake', 'steering', 'rpm', 'gear'] as TelemetryChannel[],
  
  // Telemetry data
  telemetryData: new Map(),
  loadingStatus: new Map(),
  
  // Upload state
  uploadedLap: null,
  
  // UI state
  chartZoom: null,
  theme: 'dark' as const,
  
  // Accessibility
  liveRegionMessage: '',
};

/**
 * Create the dashboard store
 */
export const useDashboardStore = create<DashboardStore>((set, get) => ({
  ...initialState,
  
  // ========================================
  // Track Actions (Subtask 4.1)
  // ========================================
  
  /**
   * Set the selected track and load its data
   * Requirement 2.1: Display dropdown selector with all available tracks
   * Requirement 2.2: Load top10 lap times and driver stats within 1 second
   * Task 19.3: Performance monitoring
   */
  setTrack: async (trackId: string) => {
    performanceMonitor.startMark('track-load');
    
    try {
      // Load manifest if not already loaded
      const manifest = get().trackManifest || await loadRootManifest();
      
      // Verify track exists
      const trackExists = manifest.tracks.some(t => t.id === trackId);
      if (!trackExists) {
        throw new Error(`Track "${trackId}" not found in manifest`);
      }
      
      // Set selected track immediately for UI feedback
      set({ 
        selectedTrack: trackId,
        trackManifest: manifest,
        // Clear previous track data
        lapTimes: [],
        driverStats: [],
        selectedLaps: [],
        telemetryData: new Map(),
        loadingStatus: new Map(),
        uploadedLap: null,
      });
      
      // Fetch track data (lap times and driver stats)
      const { lapTimes, driverStats } = await fetchTrackData(trackId);
      
      // Update state with fetched data
      set({ 
        lapTimes,
        driverStats,
      });
      
      // Get track name for announcement
      const trackInfo = manifest.tracks.find(t => t.id === trackId);
      const trackName = trackInfo?.name || trackId;
      
      // End performance measurement
      const duration = performanceMonitor.endMark('track-load');
      
      // Check if requirement is met (< 1000ms)
      if (duration && duration > 1000) {
        console.warn(`⚠️ Track load took ${duration.toFixed(2)}ms (requirement: < 1000ms)`);
      }
      
      // Announce track change to screen readers
      get().announce(`Track changed to ${trackName}. ${lapTimes.length} laps loaded.`);
      
    } catch (error) {
      performanceMonitor.endMark('track-load');
      console.error('Failed to set track:', error);
      throw error;
    }
  },
  
  /**
   * Toggle a lap's selection state
   * Requirement 2.3: Provide multi-select interface for choosing laps
   * Requirement 2.4: Allow selection of up to 5 laps simultaneously
   * Requirement 2.5: Update visualization within 500ms
   * Task 19.3: Performance monitoring
   */
  toggleLap: (driverNumber: number, lapNumber: number, sourceDir: string) => {
    performanceMonitor.startMark('lap-selection');
    
    const { selectedLaps } = get();
    
    // Check if this specific lap is already selected
    const isSelected = selectedLaps.some(
      lap => lap.driverNumber === driverNumber && 
             lap.lapNumber === lapNumber && 
             lap.sourceDir === sourceDir
    );
    
    if (isSelected) {
      // Remove lap from selection
      const newSelectedLaps = selectedLaps.filter(
        lap => !(lap.driverNumber === driverNumber && 
                 lap.lapNumber === lapNumber && 
                 lap.sourceDir === sourceDir)
      );
      set({ selectedLaps: newSelectedLaps });
      
      // Announce deselection to screen readers
      get().announce(`Driver ${driverNumber}, lap ${lapNumber} deselected. ${newSelectedLaps.length} laps selected.`);
    } else {
      // Add lap if under max limit
      if (selectedLaps.length < config.maxSelectedDrivers) {
        const newSelectedLaps = [...selectedLaps, { driverNumber, lapNumber, sourceDir }];
        set({ selectedLaps: newSelectedLaps });
        
        // Announce selection to screen readers
        get().announce(`Driver ${driverNumber}, lap ${lapNumber} selected. ${newSelectedLaps.length} laps selected.`);
        
        // Automatically load telemetry for this lap
        get().loadLapTelemetry(driverNumber, lapNumber, sourceDir);
      } else {
        console.warn(`Cannot select more than ${config.maxSelectedDrivers} laps`);
        
        // Announce limit reached to screen readers
        get().announce(`Maximum ${config.maxSelectedDrivers} laps already selected. Remove a lap to select another.`);
      }
    }
    
    // End performance measurement
    const duration = performanceMonitor.endMark('lap-selection');
    
    // Check if requirement is met (< 500ms)
    if (duration && duration > 500) {
      console.warn(`⚠️ Lap selection took ${duration.toFixed(2)}ms (requirement: < 500ms)`);
    }
  },
  
  // ========================================
  // Telemetry Data Actions (Subtask 4.2)
  // ========================================
  
  /**
   * Load telemetry data for a specific lap
   * Requirement 1.2: Defer loading until user selects specific laps
   * Requirement 1.3: Fetch telemetry data for specific lap from combined file
   * Requirement 1.5: Cache fetched lap files in IndexedDB
   * Requirement 1.6: Display loading indicator with progress percentage
   */
  loadLapTelemetry: async (driverNumber: number, lapNumber: number, sourceDir: string) => {
    const { selectedTrack, telemetryData, loadingStatus } = get();
    
    if (!selectedTrack) {
      throw new Error('No track selected');
    }
    
    const lapId = `${driverNumber}_${lapNumber}_${sourceDir}`;
    
    // Check if already loaded in memory
    if (telemetryData.has(lapId)) {
      console.log(`Lap ${lapId} already loaded in memory`);
      return;
    }
    
    // Check if already loading
    const currentStatus = loadingStatus.get(lapId);
    if (currentStatus && currentStatus.status === 'fetching') {
      console.log(`Lap ${lapId} is already being fetched`);
      return;
    }
    
    try {
      // Set loading status
      const newLoadingStatus = new Map(loadingStatus);
      newLoadingStatus.set(lapId, {
        status: 'fetching',
        progress: 0,
      });
      set({ loadingStatus: newLoadingStatus });
      
      // Check IndexedDB cache first (Requirement 1.5)
      const cachedLap = await getCachedLap(selectedTrack, driverNumber, lapNumber);
      
      if (cachedLap) {
        console.log(`Lap ${lapId} loaded from cache`);
        
        // Store in memory
        const newTelemetryData = new Map(telemetryData);
        newTelemetryData.set(lapId, cachedLap);
        
        // Update loading status to complete
        const finalLoadingStatus = new Map(get().loadingStatus);
        finalLoadingStatus.set(lapId, {
          status: 'complete',
          progress: 100,
        });
        
        set({
          telemetryData: newTelemetryData,
          loadingStatus: finalLoadingStatus,
        });
        
        // Announce telemetry loaded from cache to screen readers
        get().announce(`Telemetry data for driver ${driverNumber}, lap ${lapNumber} loaded from cache.`);
        
        return;
      }
      
      // Update status to parsing
      const parsingStatus = new Map(get().loadingStatus);
      parsingStatus.set(lapId, {
        status: 'parsing',
        progress: 50,
      });
      set({ loadingStatus: parsingStatus });
      
      // Fetch and parse telemetry from the combined file
      const { fetchTelemetry } = await import('../utils/dataFetcher');
      console.log(`Fetching telemetry for track: ${selectedTrack}`);
      const allTelemetry = await fetchTelemetry(selectedTrack);
      console.log(`Total telemetry points fetched: ${allTelemetry.length}`);
      
      // Filter telemetry points for this specific lap
      const lapPoints = allTelemetry.filter(
        point => point.NUMBER === driverNumber && 
                 point.lap === lapNumber &&
                 point.SOURCE_DIR === sourceDir
      );
      
      console.log(`Filtered ${lapPoints.length} points for driver ${driverNumber}, lap ${lapNumber}, source ${sourceDir}`);
      
      if (lapPoints.length === 0) {
        console.error(`No telemetry data found. Available drivers:`, 
          Array.from(new Set(allTelemetry.map(p => p.NUMBER))).slice(0, 10),
          `Available laps for driver ${driverNumber}:`,
          Array.from(new Set(allTelemetry.filter(p => p.NUMBER === driverNumber).map(p => p.lap))).slice(0, 10)
        );
        throw new Error(`No telemetry data found for driver ${driverNumber}, lap ${lapNumber} in ${sourceDir}`);
      }
      
      // Calculate metadata
      const speeds = lapPoints.map(p => p.speed).filter((s): s is number => s !== null);
      const maxSpeed = speeds.length > 0 ? Math.max(...speeds) : 0;
      const avgSpeed = speeds.length > 0 ? speeds.reduce((a, b) => a + b, 0) / speeds.length : 0;
      
      console.log(`Speed data: ${speeds.length} valid points, max: ${maxSpeed.toFixed(1)} km/h, avg: ${avgSpeed.toFixed(1)} km/h`);
      
      // Calculate duration from timestamps
      let duration = 0;
      if (lapPoints.length > 1) {
        const firstTime = new Date(lapPoints[0].timestamp).getTime();
        const lastTime = new Date(lapPoints[lapPoints.length - 1].timestamp).getTime();
        duration = (lastTime - firstTime) / 1000; // Convert to seconds
        
        // Fallback to estimation if timestamps are invalid
        if (isNaN(duration) || duration <= 0) {
          duration = lapPoints.length * 0.1; // Estimate ~10Hz sampling
        }
      }
      
      // Find driver stats for sector calculation
      const { driverStats } = get();
      const driverStat = driverStats.find(stat => stat.NUMBER === driverNumber);
      
      // Calculate sectors if driver stats are available (Requirement 10.1)
      const sectors = driverStat ? calculateSectors({
        driverNumber,
        lapNumber,
        points: lapPoints,
        sectors: [],
        metadata: { duration, maxSpeed, avgSpeed },
      }, driverStat) : [];
      
      // Create lap telemetry object
      const lapTelemetry: LapTelemetry = {
        driverNumber,
        lapNumber,
        points: lapPoints,
        sectors,
        metadata: {
          duration,
          maxSpeed,
          avgSpeed,
        },
      };
      
      // Cache the fetched data (Requirement 1.5)
      await setCachedLap(selectedTrack, driverNumber, lapNumber, lapTelemetry);
      
      // Store telemetry data in memory
      const newTelemetryData = new Map(telemetryData);
      newTelemetryData.set(lapId, lapTelemetry);
      
      // Update loading status to complete
      const finalLoadingStatus = new Map(get().loadingStatus);
      finalLoadingStatus.set(lapId, {
        status: 'complete',
        progress: 100,
      });
      
      set({
        telemetryData: newTelemetryData,
        loadingStatus: finalLoadingStatus,
      });
      
      // Announce telemetry loaded to screen readers
      get().announce(`Telemetry data for driver ${driverNumber}, lap ${lapNumber} loaded successfully. ${lapPoints.length} data points.`);
      
    } catch (error) {
      console.error(`Failed to load lap telemetry for ${lapId}:`, error);
      
      // Set error status
      const errorLoadingStatus = new Map(get().loadingStatus);
      errorLoadingStatus.set(lapId, {
        status: 'error',
        progress: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      set({ loadingStatus: errorLoadingStatus });
      
      throw error;
    }
  },
  
  // ========================================
  // Upload and Export Actions (Subtask 4.3)
  // ========================================
  
  /**
   * Upload and parse a user's lap data file
   * Requirement 5.1: Provide upload button that accepts CSV files
   * Requirement 5.2: Validate required columns
   * Requirement 5.3: Display specific error messages for missing columns
   * Requirement 5.4: Parse data and overlay on telemetry charts within 2 seconds
   * Requirement 5.5: Render with dashed line style to distinguish from top10 laps
   */
  uploadLap: async (file: File) => {
    const startTime = performance.now();
    
    try {
      // Validate file size
      if (file.size > config.maxUploadSizeBytes) {
        throw new Error(
          `File size (${(file.size / 1024 / 1024).toFixed(2)} MB) exceeds maximum allowed size (${config.maxUploadSizeBytes / 1024 / 1024} MB)`
        );
      }
      
      // Validate file type
      if (!file.name.endsWith('.csv')) {
        throw new Error('Only CSV files are supported');
      }
      
      // Read file content
      const text = await file.text();
      
      // Extract headers for validation
      const lines = text.trim().split('\n');
      if (lines.length < 2) {
        throw new Error('CSV file is empty or has no data rows');
      }
      
      const headers = lines[0].split(',').map(h => h.trim());
      
      // Parse CSV (Requirement 5.4: Complete within 2 seconds)
      const points = parseTelemetry(text);
      
      if (points.length === 0) {
        throw new Error('No valid telemetry data found in file');
      }
      
      // Validate columns and data (Requirements 5.2, 5.3)
      const { validateUploadedCSV } = await import('../utils/uploadValidator');
      const validation = validateUploadedCSV(headers, points);
      
      if (!validation.valid) {
        // Throw error with specific validation messages (Requirement 5.3)
        throw new Error(validation.errors.join('\n'));
      }
      
      // Calculate metadata
      const speeds = points.map(p => p.speed).filter((s): s is number => s !== null);
      const maxSpeed = speeds.length > 0 ? Math.max(...speeds) : 0;
      const avgSpeed = speeds.length > 0 ? speeds.reduce((a, b) => a + b, 0) / speeds.length : 0;
      
      // Calculate duration from timestamps
      let duration = 0;
      if (points.length > 1) {
        const firstTime = new Date(points[0].timestamp).getTime();
        const lastTime = new Date(points[points.length - 1].timestamp).getTime();
        duration = (lastTime - firstTime) / 1000; // Convert to seconds
        
        // Fallback to estimation if timestamps are invalid
        if (isNaN(duration) || duration <= 0) {
          duration = points.length * 0.1; // Estimate ~10Hz sampling
        }
      }
      
      // Find driver stats for sector calculation
      const { driverStats } = get();
      const uploadedDriverNumber = points[0].NUMBER || 0;
      const driverStat = driverStats.find(stat => stat.NUMBER === uploadedDriverNumber);
      
      // Calculate sectors if driver stats are available (Requirement 10.1)
      const sectors = driverStat ? calculateSectors({
        driverNumber: uploadedDriverNumber,
        lapNumber: points[0].lap || 0,
        points,
        sectors: [],
        metadata: {
          duration,
          maxSpeed,
          avgSpeed,
        },
      }, driverStat) : [];
      
      // Create lap telemetry object
      const uploadedLap: LapTelemetry = {
        driverNumber: uploadedDriverNumber,
        lapNumber: points[0].lap || 0,
        points,
        sectors,
        metadata: {
          duration,
          maxSpeed,
          avgSpeed,
        },
      };
      
      // Store uploaded lap (Requirement 5.5: Will be rendered with dashed line in TelemetryChart)
      set({ uploadedLap });
      
      // Announce upload success to screen readers
      get().announce(`Lap data uploaded successfully. ${points.length} telemetry points loaded.`);
      
      // Log performance (should be < 2 seconds per Requirement 5.4)
      const elapsed = performance.now() - startTime;
      console.log(`Upload completed in ${(elapsed / 1000).toFixed(2)}s (${points.length} points)`);
      
      if (elapsed > 2000) {
        console.warn(`Upload took longer than 2 seconds: ${(elapsed / 1000).toFixed(2)}s`);
      }
      
    } catch (error) {
      console.error('Failed to upload lap:', error);
      throw error;
    }
  },
  
  /**
   * Export currently displayed telemetry data
   * Requirement 8.1: Provide export button that generates CSV file
   * Requirement 8.2: Include data for all currently selected drivers
   * Requirement 8.3: Include metadata in exported file
   * Requirement 8.4: Trigger browser download within 1 second
   */
  exportData: () => {
    const { selectedTrack, trackManifest, selectedLaps, telemetryData, uploadedLap } = get();
    
    if (!selectedTrack) {
      console.warn('No track selected for export');
      throw new Error('No track selected for export');
    }
    
    if (selectedLaps.length === 0 && !uploadedLap) {
      console.warn('No laps selected and no uploaded lap for export');
      throw new Error('No laps selected and no uploaded lap for export');
    }
    
    try {
      // Get track name for metadata
      const trackInfo = trackManifest?.tracks.find(t => t.id === selectedTrack);
      const trackName = trackInfo?.name || selectedTrack;
      
      // Extract driver numbers from selected laps
      const selectedDrivers = Array.from(new Set(selectedLaps.map(lap => lap.driverNumber)));
      
      // Use the export utility function
      exportTelemetryData({
        trackName,
        selectedDrivers,
        telemetryData,
        uploadedLap,
      });
      
    } catch (error) {
      console.error('Failed to export data:', error);
      throw error;
    }
  },
  
  /**
   * Export driver statistics to CSV
   * Requirement 8.5: Export driver statistics as CSV
   */
  exportDriverStats: () => {
    const { selectedTrack, trackManifest, driverStats } = get();
    
    if (!selectedTrack) {
      console.warn('No track selected for export');
      throw new Error('No track selected for export');
    }
    
    if (driverStats.length === 0) {
      console.warn('No driver statistics available for export');
      throw new Error('No driver statistics available for export');
    }
    
    try {
      // Get track name for metadata
      const trackInfo = trackManifest?.tracks.find(t => t.id === selectedTrack);
      const trackName = trackInfo?.name || selectedTrack;
      
      // Use the export utility function
      exportDriverStats({
        trackName,
        driverStats,
      });
      
    } catch (error) {
      console.error('Failed to export driver statistics:', error);
      throw error;
    }
  },
  
  // ========================================
  // UI State Actions
  // ========================================
  
  /**
   * Set the chart zoom state
   */
  setChartZoom: (zoom) => {
    set({ chartZoom: zoom });
  },
  
  /**
   * Toggle a telemetry channel's visibility
   */
  toggleChannel: (channel) => {
    const { visibleChannels } = get();
    
    if (visibleChannels.includes(channel)) {
      set({
        visibleChannels: visibleChannels.filter(c => c !== channel),
      });
    } else {
      set({
        visibleChannels: [...visibleChannels, channel],
      });
    }
  },
  
  /**
   * Set the theme
   */
  setTheme: (theme) => {
    set({ theme });
  },
  
  /**
   * Clear uploaded lap data
   */
  clearUploadedLap: () => {
    set({ uploadedLap: null });
  },
  
  /**
   * Reset all state to initial values
   */
  reset: () => {
    set(initialState);
  },
  
  /**
   * Announce a message to screen readers via live region
   */
  announce: (message: string) => {
    set({ liveRegionMessage: message });
  },
}));
