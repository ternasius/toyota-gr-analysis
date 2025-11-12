/**
 * Data Fetching Utilities
 * 
 * Provides functions to fetch and parse CSV data with retry logic,
 * exponential backoff, and proper error handling.
 */

import { config } from '../config';
import { parseLapTimes, parseDriverStats, parseTelemetry } from './csvParser';
import type { LapTime, DriverStats, TelemetryPoint } from '../types/data';

/**
 * Custom error class for fetch failures
 */
export class FetchError extends Error {
  statusCode?: number;
  url?: string;
  
  constructor(
    message: string,
    statusCode?: number,
    url?: string
  ) {
    super(message);
    this.name = 'FetchError';
    this.statusCode = statusCode;
    this.url = url;
  }
}

/**
 * Fetch with retry logic and exponential backoff
 * @param url - URL to fetch
 * @param retries - Maximum number of retry attempts (default: 3)
 * @param timeoutMs - Request timeout in milliseconds
 * @returns Response object
 * @throws FetchError if all retries fail
 */
export async function fetchWithRetry(
  url: string,
  retries: number = 3,
  timeoutMs: number = config.fetchTimeoutMs
): Promise<Response> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
      
      const response = await fetch(url, {
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new FetchError(
          `HTTP ${response.status}: ${response.statusText}`,
          response.status,
          url
        );
      }
      
      return response;
    } catch (error) {
      lastError = error as Error;
      
      // Don't retry on abort (timeout)
      if (error instanceof Error && error.name === 'AbortError') {
        throw new FetchError(
          `Request timeout after ${timeoutMs}ms`,
          undefined,
          url
        );
      }
      
      // Don't retry on 4xx errors (client errors)
      if (error instanceof FetchError && error.statusCode && error.statusCode >= 400 && error.statusCode < 500) {
        throw error;
      }
      
      // If this is the last attempt, throw the error
      if (attempt === retries - 1) {
        break;
      }
      
      // Exponential backoff: wait 1s, 2s, 4s, etc.
      const backoffMs = 1000 * Math.pow(2, attempt);
      console.warn(`Fetch attempt ${attempt + 1} failed for ${url}, retrying in ${backoffMs}ms...`);
      await new Promise(resolve => setTimeout(resolve, backoffMs));
    }
  }
  
  // All retries failed
  throw new FetchError(
    `Failed to fetch after ${retries} attempts: ${lastError?.message}`,
    undefined,
    url
  );
}

/**
 * Fetch and parse top10_lap_times.csv for a specific track
 * @param trackId - Track identifier (e.g., "barber_top10")
 * @returns Array of LapTime objects
 */
export async function fetchLapTimes(trackId: string): Promise<LapTime[]> {
  const url = `${config.dataBaseUrl}/${trackId}/top10_lap_times.csv`;
  
  try {
    const response = await fetchWithRetry(url);
    const text = await response.text();
    return parseLapTimes(text);
  } catch (error) {
    console.error(`Failed to fetch lap times for ${trackId}:`, error);
    throw error;
  }
}

/**
 * Fetch and parse driver_session_stats.csv for a specific track
 * @param trackId - Track identifier (e.g., "barber_top10")
 * @returns Array of DriverStats objects
 */
export async function fetchDriverStats(trackId: string): Promise<DriverStats[]> {
  const url = `${config.dataBaseUrl}/${trackId}/driver_session_stats.csv`;
  
  try {
    const response = await fetchWithRetry(url);
    const text = await response.text();
    const allStats = parseDriverStats(text);
    
    // Deduplicate: keep only the best lap time for each driver
    const bestStatsMap = new Map<number, DriverStats>();
    
    allStats.forEach(stat => {
      const existing = bestStatsMap.get(stat.NUMBER);
      if (!existing || stat['BestLap(s)'] < existing['BestLap(s)']) {
        bestStatsMap.set(stat.NUMBER, stat);
      }
    });
    
    return Array.from(bestStatsMap.values());
  } catch (error) {
    console.error(`Failed to fetch driver stats for ${trackId}:`, error);
    throw error;
  }
}

/**
 * Fetch and parse top10_telemetry_per_timestamp.csv for a specific track
 * Note: This is typically a large file and should be used sparingly.
 * Prefer loading individual lap files instead.
 * @param trackId - Track identifier (e.g., "barber_top10")
 * @returns Array of TelemetryPoint objects
 */
export async function fetchTelemetry(trackId: string): Promise<TelemetryPoint[]> {
  const url = `${config.dataBaseUrl}/${trackId}/top10_telemetry_per_timestamp.csv`;
  
  try {
    const response = await fetchWithRetry(url, 3, 60000); // Longer timeout for large file
    const text = await response.text();
    return parseTelemetry(text);
  } catch (error) {
    console.error(`Failed to fetch telemetry for ${trackId}:`, error);
    throw error;
  }
}

/**
 * Fetch track data (lap times and driver stats) in parallel
 * @param trackId - Track identifier
 * @returns Object containing lap times and driver stats
 */
export async function fetchTrackData(trackId: string): Promise<{
  lapTimes: LapTime[];
  driverStats: DriverStats[];
}> {
  try {
    const [lapTimes, driverStats] = await Promise.all([
      fetchLapTimes(trackId),
      fetchDriverStats(trackId),
    ]);
    
    return { lapTimes, driverStats };
  } catch (error) {
    console.error(`Failed to fetch track data for ${trackId}:`, error);
    throw error;
  }
}
