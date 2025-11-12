/**
 * Export Utilities
 * 
 * Functions for exporting telemetry data and driver statistics to CSV format.
 * 
 * Requirements:
 * - 8.1: Provide export button that generates CSV file
 * - 8.2: Include data for all currently selected drivers
 * - 8.3: Include metadata in exported file
 * - 8.4: Trigger browser download within 1 second
 * - 8.5: Export driver statistics as CSV
 */

import type { TelemetryPoint, DriverStats, LapTelemetry } from '../types/data';

/**
 * Trigger a browser download of a CSV file
 * @param csv - CSV content as string
 * @param filename - Name of the file to download
 */
function triggerDownload(csv: string, filename: string): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Format a timestamp for use in filenames
 * @returns ISO timestamp with special characters replaced
 */
function getTimestampForFilename(): string {
  return new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
}

/**
 * Export telemetry data to CSV format
 * 
 * Requirements:
 * - 8.1: Generate CSV from currently displayed telemetry
 * - 8.2: Include all selected drivers in export
 * - 8.3: Add metadata header (track, lap numbers, driver numbers, timestamp)
 * - 8.4: Trigger browser download within 1 second
 * 
 * @param options - Export options
 * @returns void
 */
export function exportTelemetryData(options: {
  trackName: string;
  selectedDrivers: number[];
  telemetryData: Map<string, LapTelemetry>;
  uploadedLap: LapTelemetry | null;
}): void {
  const startTime = performance.now();
  
  const { trackName, selectedDrivers, telemetryData, uploadedLap } = options;
  
  // Collect all telemetry points from selected drivers
  const allPoints: TelemetryPoint[] = [];
  const driverLapInfo: string[] = [];
  
  // Add selected drivers' telemetry
  selectedDrivers.forEach(driverNumber => {
    telemetryData.forEach((lap) => {
      if (lap.driverNumber === driverNumber) {
        allPoints.push(...lap.points);
        driverLapInfo.push(`Driver ${driverNumber} Lap ${lap.lapNumber}`);
      }
    });
  });
  
  // Add uploaded lap if present
  if (uploadedLap) {
    allPoints.push(...uploadedLap.points);
    driverLapInfo.push(`Uploaded: Driver ${uploadedLap.driverNumber} Lap ${uploadedLap.lapNumber}`);
  }
  
  if (allPoints.length === 0) {
    console.warn('No telemetry data available for export');
    throw new Error('No telemetry data available for export');
  }
  
  // Generate metadata header (Requirement 8.3)
  const timestamp = new Date().toISOString();
  const metadataLines = [
    '# Race Telemetry Dashboard Export',
    `# Track: ${trackName}`,
    `# Exported: ${timestamp}`,
    `# Drivers: ${selectedDrivers.join(', ')}${uploadedLap ? ' + Uploaded Lap' : ''}`,
    `# Laps: ${driverLapInfo.join(', ')}`,
    `# Total Points: ${allPoints.length}`,
    '#',
  ];
  
  // Generate CSV header
  const headers = [
    'vehicle_id',
    'meta_time',
    'timestamp',
    'lap',
    'Laptrigger_lapdist_dls',
    'Steering_Angle',
    'VBOX_Lat_Min',
    'VBOX_Long_Minutes',
    'accx_can',
    'accy_can',
    'aps',
    'gear',
    'nmot',
    'pbrake_f',
    'pbrake_r',
    'speed',
    'NUMBER',
    'SOURCE_DIR',
  ];
  
  // Generate CSV rows
  const rows = allPoints.map(point => [
    point.vehicle_id,
    point.meta_time,
    point.timestamp,
    point.lap,
    point.Laptrigger_lapdist_dls ?? '',
    point.Steering_Angle ?? '',
    point.VBOX_Lat_Min ?? '',
    point.VBOX_Long_Minutes ?? '',
    point.accx_can ?? '',
    point.accy_can ?? '',
    point.aps ?? '',
    point.gear ?? '',
    point.nmot ?? '',
    point.pbrake_f ?? '',
    point.pbrake_r ?? '',
    point.speed ?? '',
    point.NUMBER,
    point.SOURCE_DIR,
  ].join(','));
  
  // Combine metadata, header, and rows
  const csv = [...metadataLines, headers.join(','), ...rows].join('\n');
  
  // Generate filename with timestamp
  const filename = `telemetry_${trackName}_${getTimestampForFilename()}.csv`;
  
  // Trigger download (Requirement 8.4: within 1 second)
  triggerDownload(csv, filename);
  
  // Log performance
  const elapsed = performance.now() - startTime;
  console.log(`Exported ${allPoints.length} telemetry points to ${filename} in ${elapsed.toFixed(0)}ms`);
  
  if (elapsed > 1000) {
    console.warn(`Export took longer than 1 second: ${elapsed.toFixed(0)}ms`);
  }
}

/**
 * Export driver statistics to CSV format
 * 
 * Requirement 8.5: Export driver statistics as CSV
 * 
 * @param options - Export options
 * @returns void
 */
export function exportDriverStats(options: {
  trackName: string;
  driverStats: DriverStats[];
}): void {
  const startTime = performance.now();
  
  const { trackName, driverStats } = options;
  
  if (driverStats.length === 0) {
    console.warn('No driver statistics available for export');
    throw new Error('No driver statistics available for export');
  }
  
  // Generate metadata header
  const timestamp = new Date().toISOString();
  const metadataLines = [
    '# Race Telemetry Dashboard - Driver Statistics Export',
    `# Track: ${trackName}`,
    `# Exported: ${timestamp}`,
    `# Total Drivers: ${driverStats.length}`,
    '#',
  ];
  
  // Generate CSV header (include all columns from DriverStats)
  const headers = [
    'NUMBER',
    'Laps',
    'BestLap(s)',
    'AvgLap(s)',
    'StdDev(s)',
    'S1Best',
    'S2Best',
    'S3Best',
    'TheoreticalBest(s)',
    'SOURCE_DIR',
  ];
  
  // Sort drivers by best lap time
  const sortedDrivers = [...driverStats].sort((a, b) => a['BestLap(s)'] - b['BestLap(s)']);
  
  // Generate CSV rows
  const rows = sortedDrivers.map(driver => [
    driver.NUMBER,
    driver.Laps,
    driver['BestLap(s)'],
    driver['AvgLap(s)'],
    driver['StdDev(s)'],
    driver.S1Best,
    driver.S2Best,
    driver.S3Best,
    driver['TheoreticalBest(s)'],
    driver.SOURCE_DIR,
  ].join(','));
  
  // Combine metadata, header, and rows
  const csv = [...metadataLines, headers.join(','), ...rows].join('\n');
  
  // Generate filename with timestamp
  const filename = `driver_stats_${trackName}_${getTimestampForFilename()}.csv`;
  
  // Trigger download
  triggerDownload(csv, filename);
  
  // Log performance
  const elapsed = performance.now() - startTime;
  console.log(`Exported ${driverStats.length} driver statistics to ${filename} in ${elapsed.toFixed(0)}ms`);
}
