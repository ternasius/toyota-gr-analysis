/**
 * Upload Validation Utility
 * 
 * Validates uploaded CSV files for required columns and data format.
 * Provides specific error messages for validation failures.
 * 
 * Requirements: 5.2, 5.3
 */

import type { ValidationResult, TelemetryPoint } from '../types/data';

/**
 * Required columns for uploaded telemetry CSV files
 */
const REQUIRED_COLUMNS = [
  'timestamp',
  'speed',
  'Steering_Angle',
  'pbrake_f',
  'pbrake_r',
  'aps',
] as const;

/**
 * Validate that uploaded CSV has all required columns
 * 
 * @param headers - Array of column headers from CSV
 * @returns Validation result with any missing columns
 */
export function validateColumns(headers: string[]): ValidationResult {
  const errors: string[] = [];
  const missingColumns: string[] = [];

  // Check for required columns
  for (const required of REQUIRED_COLUMNS) {
    if (!headers.includes(required)) {
      missingColumns.push(required);
    }
  }

  if (missingColumns.length > 0) {
    errors.push(`Missing required columns: ${missingColumns.join(', ')}`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate ISO 8601 timestamp format
 * Accepts formats like:
 * - 2025-09-05T00:49:11.249Z
 * - 2025-09-05 00:49:11.249000+00:00
 * - 2025-09-05T00:49:11
 * 
 * @param timestamp - Timestamp string to validate
 * @returns True if valid ISO 8601 format
 */
export function validateTimestamp(timestamp: string): boolean {
  if (!timestamp || timestamp.trim() === '') {
    return false;
  }

  // Try to parse as Date
  const date = new Date(timestamp);
  
  // Check if date is valid
  if (isNaN(date.getTime())) {
    return false;
  }

  // Additional check: timestamp should contain date separators
  const hasDateFormat = /\d{4}[-/]\d{2}[-/]\d{2}/.test(timestamp);
  
  return hasDateFormat;
}

/**
 * Validate telemetry data points
 * Checks that required fields have valid values
 * 
 * @param points - Array of parsed telemetry points
 * @returns Validation result with specific errors
 */
export function validateTelemetryData(points: TelemetryPoint[]): ValidationResult {
  const errors: string[] = [];

  if (points.length === 0) {
    errors.push('No data points found in CSV file');
    return { valid: false, errors };
  }

  // Validate first point's timestamp
  const firstPoint = points[0];
  if (!validateTimestamp(firstPoint.timestamp)) {
    errors.push(
      'Invalid timestamp format. Expected ISO 8601 format (e.g., 2025-09-05T00:49:11.249Z or 2025-09-05 00:49:11.249000+00:00)'
    );
  }

  // Check that at least some required fields have non-null values
  let hasValidSpeed = false;
  let hasValidSteering = false;
  let hasValidBrake = false;
  let hasValidThrottle = false;

  for (const point of points.slice(0, Math.min(10, points.length))) {
    if (point.speed !== null && point.speed !== undefined && !isNaN(point.speed)) {
      hasValidSpeed = true;
    }
    if (point.Steering_Angle !== null && point.Steering_Angle !== undefined) {
      hasValidSteering = true;
    }
    if ((point.pbrake_f !== null && point.pbrake_f !== undefined) || 
        (point.pbrake_r !== null && point.pbrake_r !== undefined)) {
      hasValidBrake = true;
    }
    if (point.aps !== null && point.aps !== undefined) {
      hasValidThrottle = true;
    }
  }

  // Warn if critical fields are all null (but don't fail validation)
  const warnings: string[] = [];
  if (!hasValidSpeed) {
    warnings.push('Warning: No valid speed data found in first 10 points');
  }
  if (!hasValidSteering) {
    warnings.push('Warning: No valid steering angle data found in first 10 points');
  }
  if (!hasValidBrake) {
    warnings.push('Warning: No valid brake pressure data found in first 10 points');
  }
  if (!hasValidThrottle) {
    warnings.push('Warning: No valid throttle position data found in first 10 points');
  }

  // Log warnings but don't fail validation (data can have null values)
  if (warnings.length > 0) {
    console.warn('Data validation warnings:', warnings);
  }

  // Check for reasonable data ranges
  const invalidRanges: string[] = [];
  
  for (let i = 0; i < Math.min(100, points.length); i++) {
    const point = points[i];
    
    // Speed should be reasonable (0-400 km/h)
    if (point.speed !== null && (point.speed < 0 || point.speed > 400)) {
      invalidRanges.push(`Row ${i + 2}: Speed value ${point.speed} km/h is outside reasonable range (0-400)`);
      break; // Only report first error
    }
    
    // Steering angle should be reasonable (-1000 to 1000 degrees)
    if (point.Steering_Angle !== null && (point.Steering_Angle < -1000 || point.Steering_Angle > 1000)) {
      invalidRanges.push(`Row ${i + 2}: Steering angle ${point.Steering_Angle}° is outside reasonable range (-1000 to 1000)`);
      break;
    }
    
    // Brake pressure should be reasonable (0-200 bar)
    if (point.pbrake_f !== null && (point.pbrake_f < 0 || point.pbrake_f > 200)) {
      invalidRanges.push(`Row ${i + 2}: Front brake pressure ${point.pbrake_f} bar is outside reasonable range (0-200)`);
      break;
    }
    
    // Throttle should be 0-101% (allow 1% tolerance for sensor noise)
    if (point.aps !== null && (point.aps < 0 || point.aps > 101)) {
      invalidRanges.push(`Row ${i + 2}: Throttle position ${point.aps}% is outside valid range (0-101)`);
      break;
    }
  }

  if (invalidRanges.length > 0) {
    errors.push(...invalidRanges);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Comprehensive validation of uploaded CSV file
 * Combines column validation, timestamp validation, and data validation
 * 
 * @param headers - CSV column headers
 * @param points - Parsed telemetry points
 * @returns Validation result with all errors
 */
export function validateUploadedCSV(
  headers: string[],
  points: TelemetryPoint[]
): ValidationResult {
  const errors: string[] = [];

  // Validate columns
  const columnValidation = validateColumns(headers);
  if (!columnValidation.valid) {
    errors.push(...columnValidation.errors);
  }

  // Validate data (only if columns are valid)
  if (columnValidation.valid) {
    const dataValidation = validateTelemetryData(points);
    if (!dataValidation.valid) {
      errors.push(...dataValidation.errors);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Get user-friendly error message for validation errors
 * 
 * @param errors - Array of validation errors
 * @returns Formatted error message
 */
export function formatValidationErrors(errors: string[]): string {
  if (errors.length === 0) {
    return '';
  }

  if (errors.length === 1) {
    return errors[0];
  }

  return `Multiple validation errors:\n${errors.map((e, i) => `${i + 1}. ${e}`).join('\n')}`;
}
