/**
 * CSV Parser Utility
 * 
 * Provides functions to parse CSV text into typed objects with proper
 * null/empty value handling for telemetry data files.
 * Integrates data quirk handling from notes.txt.
 */

import type { LapTime, DriverStats, TelemetryPoint } from '../types/data';
import { filterValidLapTimes, cleanTelemetryPoints } from './dataQuirks';

/**
 * Generic CSV parser that converts CSV text to array of objects
 * @param csvText - Raw CSV text content
 * @param typeConverter - Optional function to convert string values to proper types
 * @returns Array of parsed objects
 */
export function parseCSV<T>(
  csvText: string,
  typeConverter?: (row: Record<string, string>) => T
): T[] {
  const lines = csvText.trim().split('\n');
  
  if (lines.length < 2) {
    return [];
  }

  // Parse header row
  const headers = lines[0].split(',').map(h => h.trim());
  
  // Parse data rows
  const results: T[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue; // Skip empty lines
    
    const values = parseCSVLine(line);
    
    if (values.length !== headers.length) {
      console.warn(`Line ${i + 1}: Expected ${headers.length} columns, got ${values.length}`);
      continue;
    }
    
    // Create object from headers and values
    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      row[header] = values[index];
    });
    
    // Apply type conversion if provided
    const typedRow = typeConverter ? typeConverter(row) : (row as unknown as T);
    results.push(typedRow);
  }
  
  return results;
}

/**
 * Parse a single CSV line, handling quoted values and commas within quotes
 * @param line - CSV line to parse
 * @returns Array of values
 */
function parseCSVLine(line: string): string[] {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      values.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  // Add the last value
  values.push(current.trim());
  
  return values;
}

/**
 * Convert string to number, handling null/empty values
 * @param value - String value to convert
 * @returns Number or null
 */
function toNumber(value: string): number | null {
  if (value === '' || value === 'null' || value === 'NULL' || value === 'None') {
    return null;
  }
  const num = Number(value);
  return isNaN(num) ? null : num;
}

/**
 * Convert string to integer, handling null/empty values
 * @param value - String value to convert
 * @returns Integer or null
 */
function toInt(value: string): number {
  const num = toNumber(value);
  return num !== null ? Math.floor(num) : 0;
}

/**
 * Parse top10_lap_times.csv into LapTime objects
 * Filters out erroneous lap numbers (Requirement 7.5)
 * @param csvText - Raw CSV text
 * @returns Array of LapTime objects
 */
export function parseLapTimes(csvText: string): LapTime[] {
  const lapTimes = parseCSV<LapTime>(csvText, (row) => ({
    NUMBER: toInt(row.NUMBER),
    LAP_NUMBER: toInt(row.LAP_NUMBER),
    LAP_TIME_SEC: toNumber(row.LAP_TIME_SEC) || 0,
    SOURCE_DIR: row.SOURCE_DIR || '',
  }));
  
  // Filter out erroneous lap numbers (32768, etc.)
  return filterValidLapTimes(lapTimes);
}

/**
 * Parse driver_session_stats.csv into DriverStats objects
 * @param csvText - Raw CSV text
 * @returns Array of DriverStats objects
 */
export function parseDriverStats(csvText: string): DriverStats[] {
  return parseCSV<DriverStats>(csvText, (row) => ({
    NUMBER: toInt(row.NUMBER),
    Laps: toInt(row.Laps),
    'BestLap(s)': toNumber(row['BestLap(s)']) || 0,
    'AvgLap(s)': toNumber(row['AvgLap(s)']) || 0,
    'StdDev(s)': toNumber(row['StdDev(s)']) || 0,
    S1Best: toNumber(row.S1Best) || 0,
    S2Best: toNumber(row.S2Best) || 0,
    S3Best: toNumber(row.S3Best) || 0,
    'TheoreticalBest(s)': toNumber(row['TheoreticalBest(s)']) || 0,
    SOURCE_DIR: row.SOURCE_DIR || '',
  }));
}

/**
 * Parse top10_telemetry_per_timestamp.csv into TelemetryPoint objects
 * Applies data quirk fixes (Requirement 7.5):
 * - Filters erroneous lap numbers (32768)
 * - Uses meta_time as fallback when timestamp is unreliable
 * - Handles null values in telemetry fields
 * @param csvText - Raw CSV text
 * @returns Array of TelemetryPoint objects
 */
export function parseTelemetry(csvText: string): TelemetryPoint[] {
  const points = parseCSV<TelemetryPoint>(csvText, (row) => ({
    vehicle_id: row.vehicle_id || '',
    meta_time: row.meta_time || '',
    timestamp: row.timestamp || '',
    lap: toInt(row.lap),
    Laptrigger_lapdist_dls: toNumber(row.Laptrigger_lapdist_dls),
    Steering_Angle: toNumber(row.Steering_Angle),
    VBOX_Lat_Min: toNumber(row.VBOX_Lat_Min),
    VBOX_Long_Minutes: toNumber(row.VBOX_Long_Minutes),
    accx_can: toNumber(row.accx_can),
    accy_can: toNumber(row.accy_can),
    aps: toNumber(row.aps), // Throttle field (some datasets)
    ath: toNumber(row.ath), // Throttle field (other datasets)
    gear: toNumber(row.gear),
    nmot: toNumber(row.nmot),
    pbrake_f: toNumber(row.pbrake_f),
    pbrake_r: toNumber(row.pbrake_r),
    speed: toNumber(row.speed),
    NUMBER: toInt(row.NUMBER),
    SOURCE_DIR: row.SOURCE_DIR || '',
  }));
  
  // Apply data quirk fixes
  return cleanTelemetryPoints(points);
}
