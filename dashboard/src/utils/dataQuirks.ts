/**
 * Data Quirks Handler
 * 
 * Utilities to handle known data quirks and issues in the telemetry data.
 * Based on notes.txt documentation.
 * 
 * Requirement 7.5: Handle data quirks
 */

import type { TelemetryPoint, LapTime } from '../types/data';

/**
 * Check if a lap number is erroneous
 * Known issue: lap field sometimes shows 32768 when lost
 */
export function isErroneousLapNumber(lapNumber: number): boolean {
  return lapNumber === 32768 || lapNumber < 0 || lapNumber > 1000;
}

/**
 * Filter out lap times with erroneous lap numbers
 * Requirement 7.5: Filter out erroneous lap numbers (32768)
 */
export function filterValidLapTimes(lapTimes: LapTime[]): LapTime[] {
  return lapTimes.filter(lap => !isErroneousLapNumber(lap.LAP_NUMBER));
}

/**
 * Filter out telemetry points with erroneous lap numbers
 */
export function filterValidTelemetryPoints(points: TelemetryPoint[]): TelemetryPoint[] {
  return points.filter(point => !isErroneousLapNumber(point.lap));
}

/**
 * Get the best timestamp to use for a telemetry point
 * Requirement 7.5: Use meta_time as fallback when timestamp is unreliable
 * 
 * Note from notes.txt:
 * - meta_time: The time the message was received (reliable)
 * - timestamp: The time on the ECU (may not be accurate)
 */
export function getBestTimestamp(point: TelemetryPoint): string {
  // Try to use ECU timestamp first
  if (point.timestamp && isValidTimestamp(point.timestamp)) {
    return point.timestamp;
  }
  
  // Fall back to meta_time (Requirement 7.5)
  return point.meta_time;
}

/**
 * Check if a timestamp is valid
 */
function isValidTimestamp(timestamp: string): boolean {
  try {
    const date = new Date(timestamp);
    const time = date.getTime();
    
    // Check if it's a valid date
    if (isNaN(time)) return false;
    
    // Check if it's within a reasonable range (2020-2030)
    const year = date.getFullYear();
    if (year < 2020 || year > 2030) return false;
    
    return true;
  } catch {
    return false;
  }
}

/**
 * Calculate relative time from start for telemetry points
 * Uses the best available timestamp
 */
export function calculateRelativeTime(points: TelemetryPoint[]): number[] {
  if (points.length === 0) return [];
  
  // Get timestamps using best available source
  const timestamps = points.map(p => {
    const timestamp = getBestTimestamp(p);
    return new Date(timestamp).getTime();
  });
  
  // Calculate relative time from first point
  const startTime = timestamps[0];
  return timestamps.map(t => (t - startTime) / 1000); // Convert to seconds
}

/**
 * Check if a track is Sebring (has different format)
 * Requirement 7.5: Display warning for Sebring track (different format)
 */
export function isSebringStrack(trackId: string): boolean {
  return trackId.toLowerCase().includes('sebring');
}

/**
 * Get warning message for Sebring track
 */
export function getSebringSWarning(): string {
  return 'Note: Sebring telemetry data is formatted differently and may have limited availability.';
}

/**
 * Handle null values in telemetry fields
 * Requirement 7.5: Handle null values in telemetry fields (interpolate or skip)
 * 
 * Strategy:
 * - For critical fields (speed, steering): interpolate
 * - For optional fields (GPS, acceleration): skip/allow null
 */
export function shouldInterpolateField(field: keyof TelemetryPoint): boolean {
  const criticalFields: (keyof TelemetryPoint)[] = [
    'speed',
    'Steering_Angle',
    'aps',
    'pbrake_f',
    'pbrake_r',
  ];
  
  return criticalFields.includes(field);
}

/**
 * Clean telemetry point data
 * Applies all data quirk fixes
 */
export function cleanTelemetryPoint(point: TelemetryPoint): TelemetryPoint {
  return {
    ...point,
    // Use best timestamp
    timestamp: getBestTimestamp(point),
    // Set lap to 0 if erroneous (will be determined by time values)
    lap: isErroneousLapNumber(point.lap) ? 0 : point.lap,
  };
}

/**
 * Clean array of telemetry points
 */
export function cleanTelemetryPoints(points: TelemetryPoint[]): TelemetryPoint[] {
  return points.map(cleanTelemetryPoint);
}

/**
 * Validate vehicle identification
 * Note from notes.txt: Chassis number is always reliable, car NUMBER may be 000 if not assigned
 */
export function getVehicleIdentifier(point: TelemetryPoint): string {
  // Extract chassis number from vehicle_id (e.g., "GR86-004-78" -> "004")
  const match = point.vehicle_id.match(/GR86-(\d+)-/);
  const chassisNumber = match ? match[1] : 'unknown';
  
  // Use chassis number as primary identifier
  // Car NUMBER (sticker) may be 000 if not assigned yet
  if (point.NUMBER === 0 || point.NUMBER === 999) {
    return `Chassis ${chassisNumber}`;
  }
  
  return `#${point.NUMBER} (Chassis ${chassisNumber})`;
}

/**
 * Check if telemetry data quality is acceptable
 */
export function isAcceptableDataQuality(points: TelemetryPoint[]): {
  acceptable: boolean;
  issues: string[];
} {
  const issues: string[] = [];
  
  if (points.length === 0) {
    return { acceptable: false, issues: ['No data points'] };
  }
  
  // Check for minimum data points (at least 100 for a lap)
  if (points.length < 100) {
    issues.push(`Insufficient data points (${points.length} < 100)`);
  }
  
  // Check for erroneous lap numbers
  const erroneousLaps = points.filter(p => isErroneousLapNumber(p.lap)).length;
  if (erroneousLaps > points.length * 0.5) {
    issues.push(`High percentage of erroneous lap numbers (${((erroneousLaps / points.length) * 100).toFixed(1)}%)`);
  }
  
  // Check for null speed values (critical field)
  const nullSpeeds = points.filter(p => p.speed === null).length;
  if (nullSpeeds > points.length * 0.3) {
    issues.push(`High percentage of missing speed data (${((nullSpeeds / points.length) * 100).toFixed(1)}%)`);
  }
  
  // Check for invalid timestamps
  const invalidTimestamps = points.filter(p => 
    !isValidTimestamp(p.timestamp) && !isValidTimestamp(p.meta_time)
  ).length;
  if (invalidTimestamps > 0) {
    issues.push(`Invalid timestamps found (${invalidTimestamps} points)`);
  }
  
  return {
    acceptable: issues.length === 0,
    issues,
  };
}
