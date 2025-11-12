/**
 * Delta Calculator Utility
 * 
 * Calculates time deltas between uploaded laps and reference laps.
 * Provides delta visualization at key points (sector boundaries, min/max speed).
 * 
 * Requirements: 5.6, 2.5 (memoization)
 */

import type { LapTelemetry } from '../types/data';

// ============================================================================
// Memoization Cache
// ============================================================================

/**
 * Cache for delta analysis results
 * Key format: "uploadedLapId_referenceLapId"
 */
const deltaAnalysisCache = new Map<string, DeltaAnalysis>();

/**
 * Cache for key points in laps
 * Key format: "driverNum_lapNum"
 */
const keyPointsCache = new Map<string, Array<{
  time: number;
  type: 'maxSpeed' | 'minSpeed' | 'maxThrottle';
  value: number;
  label: string;
}>>();

/**
 * Maximum cache size to prevent memory issues
 */
const MAX_CACHE_SIZE = 50;

/**
 * Clear old cache entries when size exceeds maximum (LRU-style)
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
 * Generate cache key for a lap
 */
function getLapCacheKey(lap: LapTelemetry): string {
  return `${lap.driverNumber}_${lap.lapNumber}`;
}

/**
 * Generate cache key for delta analysis
 */
function getDeltaAnalysisCacheKey(uploadedLap: LapTelemetry, referenceLap: LapTelemetry): string {
  return `${getLapCacheKey(uploadedLap)}_${getLapCacheKey(referenceLap)}`;
}

/**
 * Key point in a lap where delta is calculated
 */
export interface DeltaPoint {
  time: number;           // Time in seconds
  type: 'sector' | 'maxSpeed' | 'minSpeed' | 'maxThrottle';
  label: string;          // Human-readable label
  uploadedValue: number;  // Value from uploaded lap
  referenceValue: number; // Value from reference lap
  delta: number;          // Time delta (positive = slower, negative = faster)
  description: string;    // Description of the point
}

/**
 * Result of delta calculation between two laps
 */
export interface DeltaAnalysis {
  overallDelta: number;           // Overall lap time delta
  sectorDeltas: DeltaPoint[];     // Deltas at sector boundaries
  keyPointDeltas: DeltaPoint[];   // Deltas at key performance points
  averageDelta: number;           // Average delta across all points
  maxGain: DeltaPoint | null;     // Point with maximum time gain
  maxLoss: DeltaPoint | null;     // Point with maximum time loss
}

/**
 * Calculate time delta at a specific point
 * Uses cumulative time delta based on lap progress
 * 
 * @param uploadedLap - The uploaded lap
 * @param referenceLap - The reference lap to compare against
 * @param time - Time in seconds (reference lap time)
 * @returns Time delta (positive = uploaded is slower)
 */
function calculateDeltaAtTime(
  uploadedLap: LapTelemetry,
  referenceLap: LapTelemetry,
  time: number
): number {
  // Calculate progress through the lap (0 to 1)
  const progress = time / referenceLap.metadata.duration;
  
  // Calculate expected time at this progress in uploaded lap
  const uploadedTimeAtProgress = progress * uploadedLap.metadata.duration;
  
  // Delta is the difference
  return uploadedTimeAtProgress - time;
}

/**
 * Calculate deltas at sector boundaries
 * 
 * @param uploadedLap - The uploaded lap
 * @param referenceLap - The reference lap
 * @returns Array of delta points at sector boundaries
 */
function calculateSectorDeltas(
  uploadedLap: LapTelemetry,
  referenceLap: LapTelemetry
): DeltaPoint[] {
  const deltas: DeltaPoint[] = [];
  
  // Use reference lap sectors as the baseline
  if (referenceLap.sectors.length === 0) {
    return deltas;
  }
  
  referenceLap.sectors.forEach((refSector, index) => {
    const uploadedSector = uploadedLap.sectors[index];
    
    if (!uploadedSector) {
      return; // Skip if uploaded lap doesn't have this sector
    }
    
    const delta = uploadedSector.duration - refSector.duration;
    
    deltas.push({
      time: refSector.endTime,
      type: 'sector',
      label: `S${refSector.sectorNumber}`,
      uploadedValue: uploadedSector.duration,
      referenceValue: refSector.duration,
      delta,
      description: `Sector ${refSector.sectorNumber} time`,
    });
  });
  
  return deltas;
}

/**
 * Find key performance points in a lap (MEMOIZED)
 * 
 * @param lap - The lap to analyze
 * @returns Array of key points with their times and values
 */
function findKeyPoints(lap: LapTelemetry): Array<{
  time: number;
  type: 'maxSpeed' | 'minSpeed' | 'maxThrottle';
  value: number;
  label: string;
}> {
  // Check cache first
  const cacheKey = getLapCacheKey(lap);
  const cached = keyPointsCache.get(cacheKey);
  
  if (cached) {
    return cached;
  }
  
  const keyPoints: Array<{
    time: number;
    type: 'maxSpeed' | 'minSpeed' | 'maxThrottle';
    value: number;
    label: string;
  }> = [];
  
  if (lap.points.length === 0) {
    return keyPoints;
  }
  
  // Find max speed point
  let maxSpeed = -Infinity;
  let maxSpeedIndex = -1;
  
  lap.points.forEach((point, index) => {
    if (point.speed !== null && point.speed > maxSpeed) {
      maxSpeed = point.speed;
      maxSpeedIndex = index;
    }
  });
  
  if (maxSpeedIndex !== -1) {
    keyPoints.push({
      time: maxSpeedIndex * 0.1,
      type: 'maxSpeed',
      value: maxSpeed,
      label: 'Max Speed',
    });
  }
  
  // Find min speed point (excluding start/finish)
  let minSpeed = Infinity;
  let minSpeedIndex = -1;
  const startIndex = Math.floor(lap.points.length * 0.1); // Skip first 10%
  const endIndex = Math.floor(lap.points.length * 0.9);   // Skip last 10%
  
  for (let i = startIndex; i < endIndex; i++) {
    const point = lap.points[i];
    if (point.speed !== null && point.speed > 0 && point.speed < minSpeed) {
      minSpeed = point.speed;
      minSpeedIndex = i;
    }
  }
  
  if (minSpeedIndex !== -1) {
    keyPoints.push({
      time: minSpeedIndex * 0.1,
      type: 'minSpeed',
      value: minSpeed,
      label: 'Min Speed',
    });
  }
  
  // Calculate average brake usage (percentage of lap on brakes)
  let brakePointCount = 0;
  let totalPoints = 0;
  
  lap.points.forEach((point) => {
    totalPoints++;
    const brakeValue = Math.max(point.pbrake_f || 0, point.pbrake_r || 0);
    if (brakeValue > 5) { // Consider braking if pressure > 5 bar
      brakePointCount++;
    }
  });
  
  const avgBrakeUsage = totalPoints > 0 ? (brakePointCount / totalPoints) * 100 : 0;
  
  // Add as a key point at mid-lap for comparison
  if (totalPoints > 0) {
    keyPoints.push({
      time: (lap.points.length * 0.5) * 0.1,
      type: 'maxThrottle',
      value: avgBrakeUsage,
      label: 'Brake Usage',
    });
  }
  
  // Cache the result
  keyPointsCache.set(cacheKey, keyPoints);
  clearOldCacheEntries(keyPointsCache);
  
  return keyPoints;
}

/**
 * Calculate deltas at key performance points
 * 
 * @param uploadedLap - The uploaded lap
 * @param referenceLap - The reference lap
 * @returns Array of delta points at key performance locations
 */
function calculateKeyPointDeltas(
  uploadedLap: LapTelemetry,
  referenceLap: LapTelemetry
): DeltaPoint[] {
  const deltas: DeltaPoint[] = [];
  
  // Find key points in reference lap
  const referenceKeyPoints = findKeyPoints(referenceLap);
  const uploadedKeyPoints = findKeyPoints(uploadedLap);
  
  // Match key points between laps and calculate deltas
  referenceKeyPoints.forEach((refPoint) => {
    const uploadedPoint = uploadedKeyPoints.find(p => p.type === refPoint.type);
    
    if (!uploadedPoint) {
      return; // Skip if uploaded lap doesn't have this key point
    }
    
    // Calculate time delta at this point
    const delta = calculateDeltaAtTime(uploadedLap, referenceLap, refPoint.time);
    
    // Format description based on type
    let description: string;
    if (refPoint.label === 'Brake Usage') {
      description = `${refPoint.label}: ${refPoint.value.toFixed(1)}% vs ${uploadedPoint.value.toFixed(1)}%`;
    } else {
      description = `${refPoint.label}: ${refPoint.value.toFixed(1)} vs ${uploadedPoint.value.toFixed(1)}`;
    }
    
    deltas.push({
      time: refPoint.time,
      type: refPoint.type,
      label: refPoint.label,
      uploadedValue: uploadedPoint.value,
      referenceValue: refPoint.value,
      delta,
      description,
    });
  });
  
  return deltas;
}

/**
 * Comprehensive delta analysis between uploaded lap and reference lap (MEMOIZED)
 * 
 * @param uploadedLap - The uploaded lap to analyze
 * @param referenceLap - The reference lap to compare against (typically fastest lap)
 * @returns Complete delta analysis with sector and key point deltas
 */
export function calculateLapDeltas(
  uploadedLap: LapTelemetry,
  referenceLap: LapTelemetry
): DeltaAnalysis {
  // Check cache first
  const cacheKey = getDeltaAnalysisCacheKey(uploadedLap, referenceLap);
  const cached = deltaAnalysisCache.get(cacheKey);
  
  if (cached) {
    return cached;
  }
  
  // Calculate overall lap time delta
  const overallDelta = uploadedLap.metadata.duration - referenceLap.metadata.duration;
  
  // Calculate sector deltas (Requirement 5.6: deltas at sector boundaries)
  const sectorDeltas = calculateSectorDeltas(uploadedLap, referenceLap);
  
  // Calculate key point deltas (Requirement 5.6: deltas at min/max speed)
  const keyPointDeltas = calculateKeyPointDeltas(uploadedLap, referenceLap);
  
  // Combine all deltas for analysis
  const allDeltas = [...sectorDeltas, ...keyPointDeltas];
  
  // Calculate average delta
  const averageDelta = allDeltas.length > 0
    ? allDeltas.reduce((sum, d) => sum + d.delta, 0) / allDeltas.length
    : 0;
  
  // Find maximum gain (most negative delta = fastest)
  const maxGain = allDeltas.length > 0
    ? allDeltas.reduce((best, current) => 
        current.delta < best.delta ? current : best
      )
    : null;
  
  // Find maximum loss (most positive delta = slowest)
  const maxLoss = allDeltas.length > 0
    ? allDeltas.reduce((worst, current) => 
        current.delta > worst.delta ? current : worst
      )
    : null;
  
  const result: DeltaAnalysis = {
    overallDelta,
    sectorDeltas,
    keyPointDeltas,
    averageDelta,
    maxGain,
    maxLoss,
  };
  
  // Cache the result
  deltaAnalysisCache.set(cacheKey, result);
  clearOldCacheEntries(deltaAnalysisCache);
  
  return result;
}

/**
 * Format delta value for display
 * 
 * @param delta - Delta value in seconds
 * @returns Formatted string with sign and color indicator
 */
export function formatDelta(delta: number): string {
  const sign = delta >= 0 ? '+' : '';
  return `${sign}${delta.toFixed(3)}s`;
}

/**
 * Get color for delta value (green = faster, red = slower)
 * 
 * @param delta - Delta value in seconds
 * @returns CSS color string
 */
export function getDeltaColor(delta: number): string {
  if (Math.abs(delta) < 0.01) {
    return '#888888'; // Gray for negligible difference
  }
  return delta < 0 ? '#00FF88' : '#FF006E'; // Green for faster, red for slower
}

/**
 * Create a summary text of delta analysis
 * 
 * @param analysis - Delta analysis result
 * @returns Human-readable summary
 */
export function summarizeDeltaAnalysis(analysis: DeltaAnalysis): string {
  const lines: string[] = [];
  
  lines.push(`Overall: ${formatDelta(analysis.overallDelta)}`);
  
  if (analysis.maxGain) {
    lines.push(`Best: ${analysis.maxGain.label} (${formatDelta(analysis.maxGain.delta)})`);
  }
  
  if (analysis.maxLoss) {
    lines.push(`Worst: ${analysis.maxLoss.label} (${formatDelta(analysis.maxLoss.delta)})`);
  }
  
  return lines.join(' | ');
}
