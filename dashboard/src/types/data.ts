/**
 * Data Type Definitions
 * 
 * This file contains TypeScript interfaces for all data models used in the
 * Race Telemetry Dashboard, matching the actual CSV column names and structure.
 */

// ============================================================================
// Manifest Structures
// ============================================================================

/**
 * Root manifest structure containing all available tracks
 */
export interface TrackManifest {
  version: string;
  lastUpdated: string;
  tracks: TrackInfo[];
}

/**
 * Information about a specific track
 */
export interface TrackInfo {
  id: string;
  name: string;
  top10Count: number;
  totalDrivers: number;
  fileSizes: {
    lapTimes: number;
    stats: number;
    telemetryTotal: number;
  };
}

// ============================================================================
// Lap Data Structures
// ============================================================================

/**
 * Lap time data from top10_lap_times.csv
 */
export interface LapTime {
  NUMBER: number;           // Driver/car number
  LAP_NUMBER: number;       // Lap number
  LAP_TIME_SEC: number;     // Lap time in seconds
  SOURCE_DIR: string;       // Source directory (e.g., "barber1", "barber2")
}

/**
 * Driver session statistics from driver_session_stats.csv
 */
export interface DriverStats {
  NUMBER: number;                    // Driver/car number
  Laps: number;                      // Total laps completed
  'BestLap(s)': number;              // Best lap time in seconds
  'AvgLap(s)': number;               // Average lap time in seconds
  'StdDev(s)': number;               // Standard deviation of lap times
  S1Best: number;                    // Best sector 1 time
  S2Best: number;                    // Best sector 2 time
  S3Best: number;                    // Best sector 3 time
  'TheoreticalBest(s)': number;      // Theoretical best lap (sum of best sectors)
  SOURCE_DIR: string;                // Source directory
}

// ============================================================================
// Telemetry Data Structures
// ============================================================================

/**
 * Single telemetry data point from top10_telemetry_per_timestamp.csv
 * Based on actual CSV columns with many fields potentially null/empty
 */
export interface TelemetryPoint {
  vehicle_id: string;                     // e.g., "GR86-022-13"
  meta_time: string;                      // ISO timestamp when message received
  timestamp: string;                      // ISO timestamp from ECU
  lap: number;                            // Lap number (may be erroneous, sometimes 32768)
  Laptrigger_lapdist_dls: number | null;  // Distance from start/finish line (meters)
  Steering_Angle: number | null;          // Steering wheel angle (degrees, 0=straight)
  VBOX_Lat_Min: number | null;            // GPS latitude (degrees)
  VBOX_Long_Minutes: number | null;       // GPS longitude (degrees)
  accx_can: number | null;                // Forward/backward acceleration (g)
  accy_can: number | null;                // Lateral acceleration (g)
  aps: number | null;                     // Accelerator pedal position (0-100%) - some datasets
  ath: number | null;                     // Accelerator throttle (0-100%) - other datasets
  gear: number | null;                    // Current gear selection
  nmot: number | null;                    // Engine RPM
  pbrake_f: number | null;                // Front brake pressure (bar)
  pbrake_r: number | null;                // Rear brake pressure (bar)
  speed: number | null;                   // Vehicle speed (km/h)
  NUMBER: number;                         // Car number (sticker on side)
  SOURCE_DIR: string;                     // Source directory
}

/**
 * Processed lap telemetry data with metadata
 */
export interface LapTelemetry {
  driverNumber: number;
  lapNumber: number;
  points: TelemetryPoint[];
  sectors: SectorTiming[];
  metadata: {
    duration: number;      // Lap duration in seconds
    maxSpeed: number;      // Maximum speed in km/h
    avgSpeed: number;      // Average speed in km/h
  };
}

/**
 * Sector timing information for a lap
 */
export interface SectorTiming {
  sectorNumber: 1 | 2 | 3;
  startTime: number;       // Start time in seconds
  endTime: number;         // End time in seconds
  duration: number;        // Sector duration in seconds
}

// ============================================================================
// Compressed Lap File Format
// ============================================================================

/**
 * Abbreviated telemetry point format used in compressed lap files
 * to reduce file size
 */
export interface CompressedTelemetryPoint {
  vid: string;              // vehicle_id
  mt: string;               // meta_time
  ts: string;               // timestamp
  lap: number;              // lap number
  dist: number | null;      // Laptrigger_lapdist_dls
  steer: number | null;     // Steering_Angle
  lat: number | null;       // VBOX_Lat_Min
  lon: number | null;       // VBOX_Long_Minutes
  accx: number | null;      // accx_can
  accy: number | null;      // accy_can
  aps: number | null;       // accelerator pedal position (some datasets)
  ath: number | null;       // accelerator throttle (other datasets)
  gear: number | null;      // gear
  rpm: number | null;       // nmot
  bf: number | null;        // pbrake_f
  br: number | null;        // pbrake_r
  spd: number | null;       // speed
  num: number;              // NUMBER
  src: string;              // SOURCE_DIR
}

/**
 * Per-track lap manifest structure
 */
export interface LapManifest {
  laps: LapManifestEntry[];
}

/**
 * Individual lap entry in the per-track manifest
 */
export interface LapManifestEntry {
  driverNumber: number;
  lapNumber: number;
  filename: string;
  size: number;
  pointCount: number;
  duration: number;
  preview: {
    firstTimestamp: number;
    lastTimestamp: number;
    maxSpeed: number;
  };
}

// ============================================================================
// Validation Types
// ============================================================================

/**
 * Result of CSV validation
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}
