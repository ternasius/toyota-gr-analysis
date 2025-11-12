/**
 * Telemetry Helper Utilities
 * 
 * Utilities for handling telemetry data, including checking availability
 * and handling missing data scenarios.
 * 
 * Requirements: 7.2, 7.5
 */

import type { LapTelemetry, TelemetryPoint } from '../types/data';

/**
 * Check if telemetry data is available and valid
 * Requirement 7.2: Display lap times even when telemetry unavailable
 */
export function isTelemetryAvailable(lap: LapTelemetry | undefined): boolean {
  if (!lap) return false;
  if (!lap.points || lap.points.length === 0) return false;
  
  // Check if at least some data points have valid values
  const validPoints = lap.points.filter(p => 
    p.speed !== null || 
    p.Steering_Angle !== null || 
    p.aps !== null
  );
  
  return validPoints.length > 0;
}

/**
 * Check if a specific telemetry field has data
 */
export function hasFieldData(
  lap: LapTelemetry | undefined,
  field: keyof TelemetryPoint
): boolean {
  if (!lap || !lap.points || lap.points.length === 0) return false;
  
  // Check if at least 10% of points have non-null values for this field
  const nonNullCount = lap.points.filter(p => p[field] !== null).length;
  const threshold = lap.points.length * 0.1;
  
  return nonNullCount >= threshold;
}

/**
 * Get a list of available fields in telemetry data
 */
export function getAvailableFields(lap: LapTelemetry | undefined): string[] {
  if (!lap || !lap.points || lap.points.length === 0) return [];
  
  const fields: (keyof TelemetryPoint)[] = [
    'speed',
    'Steering_Angle',
    'aps',
    'pbrake_f',
    'pbrake_r',
    'nmot',
    'gear',
    'accx_can',
    'accy_can',
  ];
  
  return fields.filter(field => hasFieldData(lap, field));
}

/**
 * Filter out null values from telemetry points for a specific field
 * Requirement 7.5: Handle null values in telemetry fields
 */
export function filterNullValues<T extends keyof TelemetryPoint>(
  points: TelemetryPoint[],
  field: T
): Array<{ point: TelemetryPoint; value: NonNullable<TelemetryPoint[T]> }> {
  return points
    .filter(p => p[field] !== null && p[field] !== undefined)
    .map(p => ({
      point: p,
      value: p[field] as NonNullable<TelemetryPoint[T]>,
    }));
}

/**
 * Interpolate missing values in telemetry data
 * Uses linear interpolation between non-null values
 * Requirement 7.5: Handle null values in telemetry fields (interpolate or skip)
 */
export function interpolateMissingValues<T extends keyof TelemetryPoint>(
  points: TelemetryPoint[],
  field: T
): TelemetryPoint[] {
  if (points.length === 0) return points;
  
  const result = [...points];
  
  // Find first non-null value
  let lastValidIndex = -1;
  for (let i = 0; i < result.length; i++) {
    if (result[i][field] !== null && result[i][field] !== undefined) {
      lastValidIndex = i;
      break;
    }
  }
  
  if (lastValidIndex === -1) {
    // No valid values found
    return result;
  }
  
  // Fill forward from first valid value
  for (let i = 0; i < lastValidIndex; i++) {
    result[i] = {
      ...result[i],
      [field]: result[lastValidIndex][field],
    };
  }
  
  // Interpolate between valid values
  for (let i = lastValidIndex + 1; i < result.length; i++) {
    if (result[i][field] !== null && result[i][field] !== undefined) {
      // Found next valid value, interpolate between lastValidIndex and i
      const startValue = result[lastValidIndex][field] as number;
      const endValue = result[i][field] as number;
      const steps = i - lastValidIndex;
      
      for (let j = lastValidIndex + 1; j < i; j++) {
        const progress = (j - lastValidIndex) / steps;
        const interpolatedValue = startValue + (endValue - startValue) * progress;
        result[j] = {
          ...result[j],
          [field]: interpolatedValue as any,
        };
      }
      
      lastValidIndex = i;
    }
  }
  
  // Fill forward from last valid value to end
  for (let i = lastValidIndex + 1; i < result.length; i++) {
    result[i] = {
      ...result[i],
      [field]: result[lastValidIndex][field],
    };
  }
  
  return result;
}

/**
 * Get telemetry data quality metrics
 */
export function getTelemetryQuality(lap: LapTelemetry | undefined): {
  available: boolean;
  completeness: number; // 0-1
  availableFields: string[];
  missingFields: string[];
} {
  if (!lap || !lap.points || lap.points.length === 0) {
    return {
      available: false,
      completeness: 0,
      availableFields: [],
      missingFields: [],
    };
  }
  
  const allFields: (keyof TelemetryPoint)[] = [
    'speed',
    'Steering_Angle',
    'aps',
    'pbrake_f',
    'pbrake_r',
    'nmot',
    'gear',
  ];
  
  const availableFields = getAvailableFields(lap);
  const missingFields = allFields.filter(f => !availableFields.includes(f as string));
  
  const completeness = availableFields.length / allFields.length;
  
  return {
    available: availableFields.length > 0,
    completeness,
    availableFields,
    missingFields: missingFields as string[],
  };
}
