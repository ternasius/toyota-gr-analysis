/**
 * Largest-Triangle-Three-Buckets (LTTB) Downsampling Algorithm
 * 
 * This algorithm downsamples time-series data while preserving the visual shape
 * of the data. It's particularly effective for telemetry visualization where
 * we need to reduce thousands of points to hundreds for efficient rendering.
 * 
 * Reference: https://github.com/sveinn-steinarsson/flot-downsample
 * Paper: "Downsampling Time Series for Visual Representation" by Sveinn Steinarsson
 */

import type { TelemetryPoint } from '../types/data';



/**
 * Downsample telemetry data using the LTTB algorithm
 * 
 * @param data - Array of telemetry points to downsample
 * @param threshold - Target number of points after downsampling (500-2000 recommended)
 * @param xAccessor - Function to extract x value (time) from telemetry point
 * @param yAccessor - Function to extract y value (e.g., speed) from telemetry point
 * @returns Downsampled array of telemetry points
 */
export function downsampleLTTB<T>(
  data: T[],
  threshold: number,
  xAccessor: (point: T) => number,
  yAccessor: (point: T) => number
): T[] {
  // If data is already smaller than threshold, return as-is
  if (data.length <= threshold) {
    return data;
  }

  // Always include first and last points
  const sampled: T[] = [data[0]];
  
  // Calculate bucket size (excluding first and last points)
  const bucketSize = (data.length - 2) / (threshold - 2);
  
  let sampledIndex = 0;
  
  for (let i = 0; i < threshold - 2; i++) {
    // Calculate bucket range
    const bucketStart = Math.floor(i * bucketSize) + 1;
    const bucketEnd = Math.floor((i + 1) * bucketSize) + 1;
    
    // Calculate average point of next bucket (for triangle area calculation)
    const nextBucketStart = Math.floor((i + 1) * bucketSize) + 1;
    const nextBucketEnd = Math.min(Math.floor((i + 2) * bucketSize) + 1, data.length);
    
    let avgX = 0;
    let avgY = 0;
    let avgRangeLength = 0;
    
    for (let j = nextBucketStart; j < nextBucketEnd; j++) {
      avgX += xAccessor(data[j]);
      avgY += yAccessor(data[j]);
      avgRangeLength++;
    }
    
    if (avgRangeLength > 0) {
      avgX /= avgRangeLength;
      avgY /= avgRangeLength;
    }
    
    // Get the coordinates of the last sampled point
    const lastX = xAccessor(sampled[sampledIndex]);
    const lastY = yAccessor(sampled[sampledIndex]);
    
    // Find point in current bucket with largest triangle area
    let maxArea = -1;
    let maxAreaIndex = bucketStart;
    
    for (let j = bucketStart; j < bucketEnd; j++) {
      const currentX = xAccessor(data[j]);
      const currentY = yAccessor(data[j]);
      
      // Calculate triangle area using the cross product formula
      // Area = 0.5 * |x1(y2 - y3) + x2(y3 - y1) + x3(y1 - y2)|
      const area = Math.abs(
        (lastX - avgX) * (currentY - lastY) -
        (lastX - currentX) * (avgY - lastY)
      ) * 0.5;
      
      if (area > maxArea) {
        maxArea = area;
        maxAreaIndex = j;
      }
    }
    
    // Add the point with the largest area
    sampled.push(data[maxAreaIndex]);
    sampledIndex++;
  }
  
  // Always include the last point
  sampled.push(data[data.length - 1]);
  
  return sampled;
}

/**
 * Downsample telemetry points for a specific channel
 * 
 * @param points - Array of telemetry points
 * @param threshold - Target number of points (500-2000 recommended)
 * @param channel - Telemetry channel to use for y-axis ('speed', 'rpm', etc.)
 * @returns Downsampled array of telemetry points
 */
export function downsampleTelemetryChannel(
  points: TelemetryPoint[],
  threshold: number,
  channel: 'speed' | 'nmot' | 'Steering_Angle' | 'aps' | 'pbrake_f' | 'pbrake_r'
): TelemetryPoint[] {
  // Create time index for x-axis (milliseconds from start)
  const startTime = new Date(points[0].timestamp || points[0].meta_time).getTime();
  
  return downsampleLTTB(
    points,
    threshold,
    (point) => {
      const time = new Date(point.timestamp || point.meta_time).getTime();
      return time - startTime;
    },
    (point) => {
      const value = point[channel];
      return value !== null ? value : 0;
    }
  );
}

/**
 * Downsample telemetry points using speed as the primary channel
 * This is the default downsampling method for general telemetry visualization
 * 
 * @param points - Array of telemetry points
 * @param threshold - Target number of points (500-2000 recommended)
 * @returns Downsampled array of telemetry points
 */
export function downsampleTelemetry(
  points: TelemetryPoint[],
  threshold: number = 1000
): TelemetryPoint[] {
  if (points.length === 0) {
    return points;
  }
  
  // Use speed as the primary channel for downsampling
  // This preserves the most important visual features for racing telemetry
  return downsampleTelemetryChannel(points, threshold, 'speed');
}
