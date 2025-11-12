/**
 * State Management Type Definitions
 * 
 * This file contains TypeScript interfaces for the Zustand store,
 * loading states, UI states, and Web Worker communication.
 */

import type { 
  TrackManifest, 
  LapTime, 
  DriverStats, 
  LapTelemetry 
} from './data';

// ============================================================================
// Telemetry Channel Types
// ============================================================================

/**
 * Available telemetry channels for visualization
 */
export type TelemetryChannel = 
  | 'speed' 
  | 'throttle' 
  | 'brake' 
  | 'steering' 
  | 'rpm' 
  | 'gear';

// ============================================================================
// Loading State Types
// ============================================================================

/**
 * Loading progress for async operations
 */
export interface LoadingProgress {
  status: 'idle' | 'fetching' | 'parsing' | 'complete' | 'error';
  progress: number;  // 0-100
  error?: string;
}

// ============================================================================
// UI State Types
// ============================================================================

/**
 * Chart zoom state for synchronized zooming across all charts
 */
export interface ZoomState {
  startTime: number;  // Start time in seconds
  endTime: number;    // End time in seconds
}

/**
 * Theme options
 */
export type Theme = 'dark' | 'light';

// ============================================================================
// Web Worker Message Types
// ============================================================================

/**
 * Messages sent to Web Worker
 */
export type WorkerRequest = 
  | {
      type: 'PARSE_LAP';
      url: string;
      lapId: string;
    }
  | {
      type: 'PARSE_UPLOAD';
      data: ArrayBuffer;
      filename: string;
    }
  | {
      type: 'DOWNSAMPLE';
      data: any[];  // TelemetryPoint array
      targetPoints: number;
    };

/**
 * Messages received from Web Worker
 */
export type WorkerResponse =
  | {
      type: 'PROGRESS';
      lapId: string;
      progress: number;
    }
  | {
      type: 'CHUNK';
      lapId: string;
      chunk: any[];  // TelemetryPoint array chunk
    }
  | {
      type: 'COMPLETE';
      lapId: string;
      metadata: {
        duration: number;
        maxSpeed: number;
        avgSpeed: number;
      };
    }
  | {
      type: 'ERROR';
      lapId: string;
      error: string;
    };

// ============================================================================
// Dashboard Store Interface
// ============================================================================

/**
 * Main Zustand store interface for the dashboard
 */
export interface DashboardStore {
  // ========================================
  // Track State
  // ========================================
  
  /** Currently selected track ID */
  selectedTrack: string | null;
  
  /** Root manifest with all track information */
  trackManifest: TrackManifest | null;
  
  /** Lap times for the selected track */
  lapTimes: LapTime[];
  
  /** Driver statistics for the selected track */
  driverStats: DriverStats[];
  
  // ========================================
  // Selection State
  // ========================================
  
  /** Array of selected laps (driver + lap number pairs, max 5) */
  selectedLaps: Array<{ driverNumber: number; lapNumber: number; sourceDir: string }>;
  
  /** Array of visible telemetry channels */
  visibleChannels: TelemetryChannel[];
  
  // ========================================
  // Telemetry Data
  // ========================================
  
  /** Map of lap telemetry data, keyed by "driverNum_lapNum" */
  telemetryData: Map<string, LapTelemetry>;
  
  /** Map of loading status for each lap, keyed by "driverNum_lapNum" */
  loadingStatus: Map<string, LoadingProgress>;
  
  // ========================================
  // Upload State
  // ========================================
  
  /** User-uploaded lap data for comparison */
  uploadedLap: LapTelemetry | null;
  
  // ========================================
  // UI State
  // ========================================
  
  /** Current chart zoom state (null = no zoom) */
  chartZoom: ZoomState | null;
  
  /** Current theme */
  theme: Theme;
  
  /** Live region message for screen reader announcements */
  liveRegionMessage: string;
  
  // ========================================
  // Actions
  // ========================================
  
  /**
   * Set the selected track and load its data
   * @param trackId - The track ID to select
   */
  setTrack: (trackId: string) => Promise<void>;
  
  /**
   * Toggle a lap's selection state
   * @param driverNumber - The driver number
   * @param lapNumber - The lap number
   * @param sourceDir - The source directory
   */
  toggleLap: (driverNumber: number, lapNumber: number, sourceDir: string) => void;
  
  /**
   * Load telemetry data for a specific lap
   * @param driverNumber - The driver number
   * @param lapNumber - The lap number
   * @param sourceDir - The source directory
   */
  loadLapTelemetry: (driverNumber: number, lapNumber: number, sourceDir: string) => Promise<void>;
  
  /**
   * Upload and parse a user's lap data file
   * @param file - The CSV file to upload
   */
  uploadLap: (file: File) => Promise<void>;
  
  /**
   * Export currently displayed telemetry data
   */
  exportData: () => void;
  
  /**
   * Export driver statistics to CSV
   */
  exportDriverStats: () => void;
  
  /**
   * Set the chart zoom state
   * @param zoom - The new zoom state (null to reset)
   */
  setChartZoom: (zoom: ZoomState | null) => void;
  
  /**
   * Toggle a telemetry channel's visibility
   * @param channel - The channel to toggle
   */
  toggleChannel: (channel: TelemetryChannel) => void;
  
  /**
   * Set the theme
   * @param theme - The theme to set
   */
  setTheme: (theme: Theme) => void;
  
  /**
   * Clear uploaded lap data
   */
  clearUploadedLap: () => void;
  
  /**
   * Reset all state to initial values
   */
  reset: () => void;
  
  /**
   * Announce a message to screen readers via live region
   * @param message - The message to announce
   */
  announce: (message: string) => void;
}
