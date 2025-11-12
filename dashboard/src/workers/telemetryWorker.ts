/**
 * Telemetry Data Processing Web Worker
 * 
 * This worker handles CPU-intensive operations off the main thread:
 * - Fetching and decompressing gzipped lap files
 * - Parsing JSON telemetry data
 * - Downsampling telemetry data using LTTB algorithm
 * - Progress reporting for long-running operations
 */

import pako from 'pako';
import type { WorkerRequest, WorkerResponse } from '../types/store';
import type { TelemetryPoint, CompressedTelemetryPoint } from '../types/data';

// ============================================================================
// Message Handler
// ============================================================================

/**
 * Main message handler for worker requests
 */
self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  const request = event.data;

  try {
    switch (request.type) {
      case 'PARSE_LAP':
        await handleParseLap(request.url, request.lapId);
        break;

      case 'PARSE_UPLOAD':
        await handleParseUpload(request.data, request.filename);
        break;

      case 'DOWNSAMPLE':
        handleDownsample(request.data, request.targetPoints);
        break;

      default:
        sendError('unknown', `Unknown request type: ${(request as any).type}`);
    }
  } catch (error) {
    const lapId = 'lapId' in request ? request.lapId : 'filename' in request ? request.filename : 'unknown';
    sendError(lapId, error instanceof Error ? error.message : String(error));
  }
};

// ============================================================================
// PARSE_LAP Handler
// ============================================================================

/**
 * Fetch, decompress, and parse a compressed lap file
 */
async function handleParseLap(url: string, lapId: string): Promise<void> {
  // Send initial progress
  sendProgress(lapId, 0);

  // Fetch the compressed file
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch lap file: ${response.status} ${response.statusText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  sendProgress(lapId, 25);

  // Decompress using pako
  const compressed = new Uint8Array(arrayBuffer);
  const decompressed = pako.inflate(compressed, { to: 'string' });
  sendProgress(lapId, 50);

  // Parse JSON
  const compressedPoints: CompressedTelemetryPoint[] = JSON.parse(decompressed);
  sendProgress(lapId, 60);

  // Convert compressed format to full format and send in chunks
  const chunkSize = 1000;
  const totalPoints = compressedPoints.length;
  
  for (let i = 0; i < totalPoints; i += chunkSize) {
    const chunkEnd = Math.min(i + chunkSize, totalPoints);
    const compressedChunk = compressedPoints.slice(i, chunkEnd);
    const chunk = compressedChunk.map(expandTelemetryPoint);
    
    sendChunk(lapId, chunk);
    
    // Update progress (60% to 95% during parsing)
    const parseProgress = 60 + ((i + chunkSize) / totalPoints) * 35;
    sendProgress(lapId, Math.min(parseProgress, 95));
  }

  // Calculate metadata
  const allPoints = compressedPoints.map(expandTelemetryPoint);
  const metadata = calculateMetadata(allPoints);
  
  sendProgress(lapId, 100);
  sendComplete(lapId, metadata);
}

// ============================================================================
// PARSE_UPLOAD Handler
// ============================================================================

/**
 * Parse uploaded CSV data
 */
async function handleParseUpload(data: ArrayBuffer, filename: string): Promise<void> {
  sendProgress(filename, 0);

  // Convert ArrayBuffer to string
  const decoder = new TextDecoder('utf-8');
  const csvText = decoder.decode(data);
  sendProgress(filename, 25);

  // Parse CSV
  const lines = csvText.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.trim());
  
  sendProgress(filename, 40);

  // Parse rows in chunks
  const chunkSize = 1000;
  const totalRows = lines.length - 1;
  
  for (let i = 1; i < lines.length; i += chunkSize) {
    const chunkEnd = Math.min(i + chunkSize, lines.length);
    const chunk: TelemetryPoint[] = [];
    
    for (let j = i; j < chunkEnd; j++) {
      const values = lines[j].split(',');
      const point: any = {};
      
      headers.forEach((header, index) => {
        const value = values[index]?.trim();
        point[header] = parseCSVValue(value);
      });
      
      chunk.push(point as TelemetryPoint);
    }
    
    sendChunk(filename, chunk);
    
    // Update progress (40% to 95% during parsing)
    const parseProgress = 40 + ((i + chunkSize - 1) / totalRows) * 55;
    sendProgress(filename, Math.min(parseProgress, 95));
  }

  // Calculate metadata from all parsed points
  const allPoints: TelemetryPoint[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',');
    const point: any = {};
    headers.forEach((header, index) => {
      const value = values[index]?.trim();
      point[header] = parseCSVValue(value);
    });
    allPoints.push(point as TelemetryPoint);
  }
  
  const metadata = calculateMetadata(allPoints);
  
  sendProgress(filename, 100);
  sendComplete(filename, metadata);
}

// ============================================================================
// DOWNSAMPLE Handler
// ============================================================================

/**
 * Downsample telemetry data using LTTB algorithm
 */
function handleDownsample(data: TelemetryPoint[], targetPoints: number): void {
  const downsampled = downsampleTelemetry(data, targetPoints);
  
  self.postMessage({
    type: 'DOWNSAMPLE_COMPLETE',
    data: downsampled
  });
}

// ============================================================================
// LTTB Downsampling Algorithm
// ============================================================================

/**
 * Downsample telemetry points using Largest-Triangle-Three-Buckets algorithm
 * Preserves visual shape while reducing point count
 */
function downsampleTelemetry(
  points: TelemetryPoint[],
  threshold: number
): TelemetryPoint[] {
  // If data is already smaller than threshold, return as-is
  if (points.length <= threshold || threshold < 3) {
    return points;
  }

  // Always include first and last points
  const sampled: TelemetryPoint[] = [points[0]];
  
  // Calculate bucket size (excluding first and last points)
  const bucketSize = (points.length - 2) / (threshold - 2);
  
  // Create time index for x-axis
  const startTime = new Date(points[0].timestamp || points[0].meta_time).getTime();
  const getX = (point: TelemetryPoint): number => {
    const time = new Date(point.timestamp || point.meta_time).getTime();
    return time - startTime;
  };
  const getY = (point: TelemetryPoint): number => {
    return point.speed !== null ? point.speed : 0;
  };
  
  let sampledIndex = 0;
  
  for (let i = 0; i < threshold - 2; i++) {
    // Calculate bucket range
    const bucketStart = Math.floor(i * bucketSize) + 1;
    const bucketEnd = Math.floor((i + 1) * bucketSize) + 1;
    
    // Calculate average point of next bucket (for triangle area calculation)
    const nextBucketStart = Math.floor((i + 1) * bucketSize) + 1;
    const nextBucketEnd = Math.min(Math.floor((i + 2) * bucketSize) + 1, points.length);
    
    let avgX = 0;
    let avgY = 0;
    let avgRangeLength = 0;
    
    for (let j = nextBucketStart; j < nextBucketEnd; j++) {
      avgX += getX(points[j]);
      avgY += getY(points[j]);
      avgRangeLength++;
    }
    
    if (avgRangeLength > 0) {
      avgX /= avgRangeLength;
      avgY /= avgRangeLength;
    }
    
    // Get the coordinates of the last sampled point
    const lastX = getX(sampled[sampledIndex]);
    const lastY = getY(sampled[sampledIndex]);
    
    // Find point in current bucket with largest triangle area
    let maxArea = -1;
    let maxAreaIndex = bucketStart;
    
    for (let j = bucketStart; j < bucketEnd; j++) {
      const currentX = getX(points[j]);
      const currentY = getY(points[j]);
      
      // Calculate triangle area using the cross product formula
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
    sampled.push(points[maxAreaIndex]);
    sampledIndex++;
  }
  
  // Always include the last point
  sampled.push(points[points.length - 1]);
  
  return sampled;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Expand compressed telemetry point to full format
 * Version: 2.0 (added ath field support)
 */
function expandTelemetryPoint(compressed: CompressedTelemetryPoint): TelemetryPoint {
  const expanded = {
    vehicle_id: compressed.vid,
    meta_time: compressed.mt,
    timestamp: compressed.ts,
    lap: compressed.lap,
    Laptrigger_lapdist_dls: compressed.dist,
    Steering_Angle: compressed.steer,
    VBOX_Lat_Min: compressed.lat,
    VBOX_Long_Minutes: compressed.lon,
    accx_can: compressed.accx,
    accy_can: compressed.accy,
    aps: compressed.aps,
    ath: compressed.ath,
    gear: compressed.gear,
    nmot: compressed.rpm,
    pbrake_f: compressed.bf,
    pbrake_r: compressed.br,
    speed: compressed.spd,
    NUMBER: compressed.num,
    SOURCE_DIR: compressed.src
  };
  
  return expanded;
}

// Log worker version on load
console.log('🔧 Telemetry Worker v2.0 loaded (with ath field support)');

/**
 * Parse CSV value to appropriate type
 */
function parseCSVValue(value: string): any {
  if (!value || value === '' || value === 'null' || value === 'NULL') {
    return null;
  }
  
  // Try to parse as number
  const num = Number(value);
  if (!isNaN(num)) {
    return num;
  }
  
  // Return as string
  return value;
}

/**
 * Calculate metadata from telemetry points
 */
function calculateMetadata(points: TelemetryPoint[]): {
  duration: number;
  maxSpeed: number;
  avgSpeed: number;
} {
  if (points.length === 0) {
    return { duration: 0, maxSpeed: 0, avgSpeed: 0 };
  }

  // Calculate duration from timestamps
  const firstTime = new Date(points[0].timestamp || points[0].meta_time).getTime();
  const lastTime = new Date(points[points.length - 1].timestamp || points[points.length - 1].meta_time).getTime();
  const duration = (lastTime - firstTime) / 1000; // Convert to seconds

  // Calculate speed statistics
  const speeds = points
    .map(p => p.speed)
    .filter((s): s is number => s !== null && !isNaN(s));
  
  const maxSpeed = speeds.length > 0 ? Math.max(...speeds) : 0;
  const avgSpeed = speeds.length > 0 
    ? speeds.reduce((sum, s) => sum + s, 0) / speeds.length 
    : 0;

  return {
    duration: Math.max(duration, 0),
    maxSpeed,
    avgSpeed
  };
}

// ============================================================================
// Message Senders
// ============================================================================

/**
 * Send progress update to main thread
 */
function sendProgress(lapId: string, progress: number): void {
  const message: WorkerResponse = {
    type: 'PROGRESS',
    lapId,
    progress: Math.min(Math.max(progress, 0), 100)
  };
  self.postMessage(message);
}

/**
 * Send data chunk to main thread
 */
function sendChunk(lapId: string, chunk: TelemetryPoint[]): void {
  const message: WorkerResponse = {
    type: 'CHUNK',
    lapId,
    chunk
  };
  self.postMessage(message);
}

/**
 * Send completion message to main thread
 */
function sendComplete(lapId: string, metadata: { duration: number; maxSpeed: number; avgSpeed: number }): void {
  const message: WorkerResponse = {
    type: 'COMPLETE',
    lapId,
    metadata
  };
  self.postMessage(message);
}

/**
 * Send error message to main thread
 */
function sendError(lapId: string, error: string): void {
  const message: WorkerResponse = {
    type: 'ERROR',
    lapId,
    error
  };
  self.postMessage(message);
}
