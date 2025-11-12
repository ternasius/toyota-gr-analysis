/**
 * Manifest Loading Utilities
 * 
 * Provides functions to load and cache manifest files (root manifest and
 * per-track lap manifests) with in-memory caching.
 */

import { config } from '../config';
import { fetchWithRetry } from './dataFetcher';
import type { TrackManifest, LapManifest } from '../types/data';

/**
 * In-memory cache for manifests
 */
class ManifestCache {
  private rootManifest: TrackManifest | null = null;
  private lapManifests: Map<string, LapManifest> = new Map();
  
  /**
   * Get cached root manifest
   */
  getRootManifest(): TrackManifest | null {
    return this.rootManifest;
  }
  
  /**
   * Set root manifest in cache
   */
  setRootManifest(manifest: TrackManifest): void {
    this.rootManifest = manifest;
  }
  
  /**
   * Get cached lap manifest for a track
   */
  getLapManifest(trackId: string): LapManifest | null {
    return this.lapManifests.get(trackId) || null;
  }
  
  /**
   * Set lap manifest in cache for a track
   */
  setLapManifest(trackId: string, manifest: LapManifest): void {
    this.lapManifests.set(trackId, manifest);
  }
  
  /**
   * Clear all cached manifests
   */
  clear(): void {
    this.rootManifest = null;
    this.lapManifests.clear();
  }
  
  /**
   * Clear lap manifest for a specific track
   */
  clearLapManifest(trackId: string): void {
    this.lapManifests.delete(trackId);
  }
}

// Singleton cache instance
const manifestCache = new ManifestCache();

/**
 * Load root manifest.json containing all available tracks
 * @param forceRefresh - If true, bypass cache and fetch fresh data
 * @returns TrackManifest object
 * @throws Error if manifest cannot be loaded
 */
export async function loadRootManifest(forceRefresh: boolean = false): Promise<TrackManifest> {
  // Check cache first
  if (!forceRefresh) {
    const cached = manifestCache.getRootManifest();
    if (cached) {
      return cached;
    }
  }
  
  const url = `${config.dataBaseUrl}/manifest.json`;
  
  try {
    const response = await fetchWithRetry(url);
    const manifest = await response.json() as TrackManifest;
    
    // Validate manifest structure
    if (!manifest.version || !manifest.tracks || !Array.isArray(manifest.tracks)) {
      throw new Error('Invalid manifest structure: missing required fields');
    }
    
    // Cache the manifest
    manifestCache.setRootManifest(manifest);
    
    return manifest;
  } catch (error) {
    console.error('Failed to load root manifest:', error);
    throw new Error(
      `Failed to load track manifest. Please check your network connection and try again. ${
        error instanceof Error ? error.message : ''
      }`
    );
  }
}

/**
 * Load per-track lap manifest containing metadata for all laps
 * @param trackId - Track identifier (e.g., "barber_top10")
 * @param forceRefresh - If true, bypass cache and fetch fresh data
 * @returns LapManifest object
 * @throws Error if manifest cannot be loaded
 */
export async function loadLapManifest(
  trackId: string,
  forceRefresh: boolean = false
): Promise<LapManifest> {
  // Check cache first
  if (!forceRefresh) {
    const cached = manifestCache.getLapManifest(trackId);
    if (cached) {
      return cached;
    }
  }
  
  const url = `${config.dataBaseUrl}/${trackId}/laps/manifest.json`;
  
  try {
    const response = await fetchWithRetry(url);
    const manifest = await response.json() as LapManifest;
    
    // Validate manifest structure
    if (!manifest.laps || !Array.isArray(manifest.laps)) {
      throw new Error('Invalid lap manifest structure: missing laps array');
    }
    
    // Cache the manifest
    manifestCache.setLapManifest(trackId, manifest);
    
    return manifest;
  } catch (error) {
    console.error(`Failed to load lap manifest for ${trackId}:`, error);
    throw new Error(
      `Failed to load lap manifest for track "${trackId}". ${
        error instanceof Error ? error.message : ''
      }`
    );
  }
}

/**
 * Get the URL for a specific lap file
 * @param trackId - Track identifier
 * @param driverNumber - Driver number
 * @param lapNumber - Lap number
 * @returns URL string for the lap file
 */
export function getLapFileUrl(
  trackId: string,
  driverNumber: number,
  lapNumber: number
): string {
  return `${config.dataBaseUrl}/${trackId}/laps/lap_${driverNumber}_${lapNumber}.json.gz`;
}

/**
 * Check if a lap file exists in the manifest
 * @param trackId - Track identifier
 * @param driverNumber - Driver number
 * @param lapNumber - Lap number
 * @returns True if lap exists in manifest, false otherwise
 */
export async function lapFileExists(
  trackId: string,
  driverNumber: number,
  lapNumber: number
): Promise<boolean> {
  try {
    const manifest = await loadLapManifest(trackId);
    return manifest.laps.some(
      lap => lap.driverNumber === driverNumber && lap.lapNumber === lapNumber
    );
  } catch (error) {
    console.error('Error checking lap file existence:', error);
    return false;
  }
}

/**
 * Clear all cached manifests
 */
export function clearManifestCache(): void {
  manifestCache.clear();
}

/**
 * Clear cached lap manifest for a specific track
 * @param trackId - Track identifier
 */
export function clearLapManifestCache(trackId: string): void {
  manifestCache.clearLapManifest(trackId);
}

/**
 * Export cache instance for testing purposes
 */
export { manifestCache };
