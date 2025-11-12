/**
 * Sector Calculator Utility
 * 
 * Calculates sector boundaries and timing information for laps based on
 * driver statistics (S1Best, S2Best, S3Best).
 * 
 * Requirements:
 * - 10.1: Divide laps into 3 sectors based on S1Best, S2Best, S3Best timing data
 * - 2.5: Memoize sector calculations for performance
 */

import type { SectorTiming, LapTelemetry, DriverStats, TelemetryPoint } from '../types/data';

// ============================================================================
// Memoization Cache
// ============================================================================

/**
 * Cache for sector calculations to avoid redundant computation
 * Key format: "driverNum_S1_S2_S3"
 */
const sectorCache = new Map<string, SectorTiming[]>();

/**
 * Cache for sector point ranges
 * Key format: "lapId_sectorHash"
 */
const pointRangeCache = new Map<string, Array<{ start: number; end: number }>>();

/**
 * Maximum cache size to prevent memory issues
 */
const MAX_CACHE_SIZE = 100;

/**
 * Clear caches when they exceed maximum size (LRU-style)
 */
function clearOldCacheEntries<K, V>(cache: Map<K, V>): void {
  if (cache.size > MAX_CACHE_SIZE) {
    const entriesToDelete = cache.size - MAX_CACHE_SIZE;
    const keys = Array.from(cache.keys());
    for (let i = 0; i < entriesToDelete; i++) {
      cache.delete(keys[i]);
    }
  }
}

/**
 * Generate cache key for sector calculations
 */
function getSectorCacheKey(driverStats: DriverStats): string {
  return `${driverStats.NUMBER}_${driverStats.S1Best}_${driverStats.S2Best}_${driverStats.S3Best}`;
}

/**
 * Generate cache key for point range calculations
 */
function getPointRangeCacheKey(lapId: string, sectors: SectorTiming[]): string {
  const sectorHash = sectors.map(s => `${s.startTime}_${s.endTime}`).join('_');
  return `${lapId}_${sectorHash}`;
}

/**
 * Calculate sector boundaries and timing for a lap (MEMOIZED)
 * 
 * This function divides a lap into 3 sectors based on the driver's best sector times.
 * Sector boundaries are calculated as cumulative time points:
 * - Sector 1: 0 to S1Best
 * - Sector 2: S1Best to (S1Best + S2Best)
 * - Sector 3: (S1Best + S2Best) to lap end
 * 
 * Results are cached to avoid redundant calculations for the same driver stats.
 * 
 * @param lap - The lap telemetry data
 * @param driverStats - Driver statistics containing sector best times
 * @returns Array of 3 SectorTiming objects
 */
export function calculateSectors(
  _lap: LapTelemetry,
  driverStats: DriverStats
): SectorTiming[] {
  // Check cache first
  const cacheKey = getSectorCacheKey(driverStats);
  const cached = sectorCache.get(cacheKey);
  
  if (cached) {
    return cached;
  }
  
  const { S1Best, S2Best, S3Best } = driverStats;
  
  // Calculate sector boundary times (cumulative)
  const sector1End = S1Best;
  const sector2End = S1Best + S2Best;
  const sector3End = S1Best + S2Best + S3Best;
  
  // Create sector timing objects
  const sectors: SectorTiming[] = [
    {
      sectorNumber: 1,
      startTime: 0,
      endTime: sector1End,
      duration: S1Best,
    },
    {
      sectorNumber: 2,
      startTime: sector1End,
      endTime: sector2End,
      duration: S2Best,
    },
    {
      sectorNumber: 3,
      startTime: sector2End,
      endTime: sector3End,
      duration: S3Best,
    },
  ];
  
  // Cache the result
  sectorCache.set(cacheKey, sectors);
  clearOldCacheEntries(sectorCache);
  
  return sectors;
}

/**
 * Find the telemetry point index closest to a given time
 * 
 * @param points - Array of telemetry points
 * @param targetTime - Target time in seconds
 * @returns Index of the closest point
 */
export function findPointIndexAtTime(
  points: TelemetryPoint[],
  targetTime: number
): number {
  if (points.length === 0) return 0;
  
  // Binary search for efficiency with large datasets
  let left = 0;
  let right = points.length - 1;
  let closestIndex = 0;
  let minDiff = Infinity;
  
  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    
    // Calculate time for this point (using index * 0.1 as proxy for now)
    // In actual implementation, this would use actual timestamp differences
    const pointTime = mid * 0.1;
    const diff = Math.abs(pointTime - targetTime);
    
    if (diff < minDiff) {
      minDiff = diff;
      closestIndex = mid;
    }
    
    if (pointTime < targetTime) {
      left = mid + 1;
    } else {
      right = mid - 1;
    }
  }
  
  return closestIndex;
}

/**
 * Calculate sector boundaries in terms of telemetry point indices (MEMOIZED)
 * 
 * This is useful for highlighting sector regions on charts.
 * Results are cached based on lap ID and sector configuration.
 * 
 * @param lap - The lap telemetry data
 * @param sectors - Array of sector timing information
 * @returns Array of point index ranges for each sector
 */
export function getSectorPointRanges(
  lap: LapTelemetry,
  sectors: SectorTiming[]
): Array<{ start: number; end: number }> {
  // Generate cache key
  const lapId = `${lap.driverNumber}_${lap.lapNumber}`;
  const cacheKey = getPointRangeCacheKey(lapId, sectors);
  
  // Check cache
  const cached = pointRangeCache.get(cacheKey);
  if (cached) {
    return cached;
  }
  
  // Calculate ranges
  const ranges = sectors.map(sector => ({
    start: findPointIndexAtTime(lap.points, sector.startTime),
    end: findPointIndexAtTime(lap.points, sector.endTime),
  }));
  
  // Cache the result
  pointRangeCache.set(cacheKey, ranges);
  clearOldCacheEntries(pointRangeCache);
  
  return ranges;
}

/**
 * Calculate sector delta compared to a reference lap
 * 
 * @param currentSector - Sector timing for current lap
 * @param referenceSector - Sector timing for reference lap
 * @returns Delta in seconds (positive = slower, negative = faster)
 */
export function calculateSectorDelta(
  currentSector: SectorTiming,
  referenceSector: SectorTiming
): number {
  return currentSector.duration - referenceSector.duration;
}

/**
 * Get color code for sector delta visualization
 * 
 * @param delta - Time delta in seconds
 * @returns Color string (green for faster, red for slower)
 */
export function getSectorDeltaColor(delta: number): string {
  if (delta < -0.01) {
    // Faster than reference (green)
    return '#00FF88';
  } else if (delta > 0.01) {
    // Slower than reference (red)
    return '#FF006E';
  } else {
    // Approximately equal (gray)
    return '#888888';
  }
}

/**
 * Format sector delta for display
 * 
 * @param delta - Time delta in seconds
 * @returns Formatted string with sign and color indicator
 */
export function formatSectorDelta(delta: number): string {
  const sign = delta >= 0 ? '+' : '';
  return `${sign}${delta.toFixed(3)}s`;
}

/**
 * Calculate actual sector times for a lap based on telemetry data
 * 
 * This function calculates the actual sector times from telemetry points,
 * which may differ from the driver's best sector times.
 * 
 * @param lap - The lap telemetry data
 * @param sectorBoundaries - Sector boundary times
 * @returns Array of actual sector timings
 */
export function calculateActualSectorTimes(
  lap: LapTelemetry,
  sectorBoundaries: SectorTiming[]
): SectorTiming[] {
  if (lap.points.length === 0) {
    return sectorBoundaries; // Return boundaries as fallback
  }
  
  // Calculate actual duration from telemetry points
  const totalPoints = lap.points.length;
  const estimatedDuration = totalPoints * 0.1; // Assume 10Hz sampling
  
  // Calculate proportional sector times based on actual lap duration
  const theoreticalTotal = sectorBoundaries.reduce((sum, s) => sum + s.duration, 0);
  const scale = estimatedDuration / theoreticalTotal;
  
  let cumulativeTime = 0;
  
  return sectorBoundaries.map((sector) => {
    const scaledDuration = sector.duration * scale;
    const startTime = cumulativeTime;
    const endTime = cumulativeTime + scaledDuration;
    
    cumulativeTime = endTime;
    
    return {
      sectorNumber: sector.sectorNumber,
      startTime,
      endTime,
      duration: scaledDuration,
    };
  });
}
