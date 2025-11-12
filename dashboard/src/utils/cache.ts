/**
 * IndexedDB Cache Implementation
 * 
 * This module provides caching functionality for lap telemetry data using IndexedDB.
 * It implements an LRU (Least Recently Used) eviction strategy to manage cache size.
 * 
 * Cache Key Structure: `{trackId}_${driverNumber}_${lapNumber}`
 * Example: "barber_top10_22_11"
 */

import { openDB, type IDBPDatabase } from 'idb';
import type { LapTelemetry } from '../types/data';

// ============================================================================
// Constants
// ============================================================================

const DB_NAME = 'telemetry-cache';
const DB_VERSION = 2; // Incremented to invalidate old cache (added 'ath' field support)
const STORE_NAME = 'laps';
const MAX_CACHE_ENTRIES = 20; // Keep 20 most recent laps (LRU)

// ============================================================================
// Types
// ============================================================================

/**
 * Cache entry structure stored in IndexedDB
 */
interface CacheEntry {
  key: string;                    // Cache key: "trackId_driverNum_lapNum"
  trackId: string;                // Track identifier
  driverNumber: number;           // Driver number
  lapNumber: number;              // Lap number
  data: LapTelemetry;             // Lap telemetry data
  size: number;                   // Approximate size in bytes
  timestamp: number;              // Last access timestamp (for LRU)
}

/**
 * Cache statistics
 */
interface CacheStats {
  entryCount: number;
  totalSize: number;
  oldestEntry: number | null;
  newestEntry: number | null;
}

// ============================================================================
// Database Connection
// ============================================================================

let dbInstance: IDBPDatabase | null = null;

/**
 * Initialize IndexedDB connection with proper error handling
 * Creates the database schema if it doesn't exist
 */
async function getDB(): Promise<IDBPDatabase> {
  if (dbInstance) {
    return dbInstance;
  }

  try {
    dbInstance = await openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // Create object store if it doesn't exist
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'key' });
          
          // Create indexes for efficient querying
          store.createIndex('timestamp', 'timestamp', { unique: false });
          store.createIndex('trackId', 'trackId', { unique: false });
          store.createIndex('driverNumber', 'driverNumber', { unique: false });
        }
      },
      blocked() {
        console.warn('IndexedDB upgrade blocked by another tab');
      },
      blocking() {
        console.warn('This tab is blocking IndexedDB upgrade');
      },
      terminated() {
        console.error('IndexedDB connection terminated unexpectedly');
        dbInstance = null;
      },
    });

    return dbInstance;
  } catch (error) {
    console.error('Failed to initialize IndexedDB:', error);
    throw new Error(`IndexedDB initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Generate cache key from track, driver, and lap identifiers
 */
export function generateCacheKey(trackId: string, driverNumber: number, lapNumber: number): string {
  return `${trackId}_${driverNumber}_${lapNumber}`;
}

/**
 * Estimate the size of lap telemetry data in bytes
 * This is an approximation for cache size management
 */
function estimateDataSize(data: LapTelemetry): number {
  // Rough estimate: each telemetry point is ~200 bytes
  // Plus overhead for metadata and structure
  const pointsSize = data.points.length * 200;
  const metadataSize = 1000; // Approximate overhead
  return pointsSize + metadataSize;
}

// ============================================================================
// Cache Operations
// ============================================================================

/**
 * Get cached lap telemetry data
 * Updates the access timestamp for LRU tracking
 * 
 * @param trackId - Track identifier
 * @param driverNumber - Driver number
 * @param lapNumber - Lap number
 * @returns Cached lap data or null if not found
 */
export async function getCachedLap(
  trackId: string,
  driverNumber: number,
  lapNumber: number
): Promise<LapTelemetry | null> {
  try {
    const db = await getDB();
    const key = generateCacheKey(trackId, driverNumber, lapNumber);
    
    const entry = await db.get(STORE_NAME, key) as CacheEntry | undefined;
    
    if (!entry) {
      return null;
    }

    // Update timestamp for LRU tracking
    entry.timestamp = Date.now();
    await db.put(STORE_NAME, entry);

    return entry.data;
  } catch (error) {
    console.error('Failed to get cached lap:', error);
    return null;
  }
}

/**
 * Store lap telemetry data in cache
 * Implements LRU eviction if cache exceeds MAX_CACHE_ENTRIES
 * 
 * @param trackId - Track identifier
 * @param driverNumber - Driver number
 * @param lapNumber - Lap number
 * @param data - Lap telemetry data to cache
 */
export async function setCachedLap(
  trackId: string,
  driverNumber: number,
  lapNumber: number,
  data: LapTelemetry
): Promise<void> {
  try {
    const db = await getDB();
    const key = generateCacheKey(trackId, driverNumber, lapNumber);

    const entry: CacheEntry = {
      key,
      trackId,
      driverNumber,
      lapNumber,
      data,
      size: estimateDataSize(data),
      timestamp: Date.now(),
    };

    // Store the entry
    await db.put(STORE_NAME, entry);

    // Check if we need to evict old entries
    await evictOldEntries(db);
  } catch (error) {
    console.error('Failed to cache lap:', error);
    throw new Error(`Failed to cache lap: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Delete a specific cached lap
 * 
 * @param trackId - Track identifier
 * @param driverNumber - Driver number
 * @param lapNumber - Lap number
 */
export async function deleteCachedLap(
  trackId: string,
  driverNumber: number,
  lapNumber: number
): Promise<void> {
  try {
    const db = await getDB();
    const key = generateCacheKey(trackId, driverNumber, lapNumber);
    await db.delete(STORE_NAME, key);
  } catch (error) {
    console.error('Failed to delete cached lap:', error);
  }
}

/**
 * Clear all cached laps for a specific track
 * 
 * @param trackId - Track identifier
 */
export async function clearTrackCache(trackId: string): Promise<void> {
  try {
    const db = await getDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const index = tx.store.index('trackId');
    
    let cursor = await index.openCursor(IDBKeyRange.only(trackId));
    
    while (cursor) {
      await cursor.delete();
      cursor = await cursor.continue();
    }
    
    await tx.done;
  } catch (error) {
    console.error('Failed to clear track cache:', error);
  }
}

/**
 * Clear all cached data
 */
export async function clearAllCache(): Promise<void> {
  try {
    const db = await getDB();
    await db.clear(STORE_NAME);
  } catch (error) {
    console.error('Failed to clear all cache:', error);
  }
}

// ============================================================================
// LRU Eviction Strategy
// ============================================================================

/**
 * Implement LRU eviction strategy
 * Removes oldest entries when cache exceeds MAX_CACHE_ENTRIES
 * 
 * @param db - IndexedDB database instance
 */
async function evictOldEntries(db: IDBPDatabase): Promise<void> {
  try {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.store;
    
    // Get all entries sorted by timestamp
    const allEntries = await store.getAll() as CacheEntry[];
    
    if (allEntries.length <= MAX_CACHE_ENTRIES) {
      await tx.done;
      return;
    }

    // Sort by timestamp (oldest first)
    allEntries.sort((a, b) => a.timestamp - b.timestamp);

    // Calculate how many entries to remove
    const entriesToRemove = allEntries.length - MAX_CACHE_ENTRIES;

    // Remove oldest entries
    for (let i = 0; i < entriesToRemove; i++) {
      await store.delete(allEntries[i].key);
    }

    await tx.done;

    console.log(`Evicted ${entriesToRemove} old cache entries (LRU)`);
  } catch (error) {
    console.error('Failed to evict old entries:', error);
  }
}

// ============================================================================
// Cache Statistics and Management
// ============================================================================

/**
 * Get cache statistics
 * 
 * @returns Cache statistics including entry count and total size
 */
export async function getCacheStats(): Promise<CacheStats> {
  try {
    const db = await getDB();
    const allEntries = await db.getAll(STORE_NAME) as CacheEntry[];

    if (allEntries.length === 0) {
      return {
        entryCount: 0,
        totalSize: 0,
        oldestEntry: null,
        newestEntry: null,
      };
    }

    const totalSize = allEntries.reduce((sum, entry) => sum + entry.size, 0);
    const timestamps = allEntries.map(e => e.timestamp);

    return {
      entryCount: allEntries.length,
      totalSize,
      oldestEntry: Math.min(...timestamps),
      newestEntry: Math.max(...timestamps),
    };
  } catch (error) {
    console.error('Failed to get cache stats:', error);
    return {
      entryCount: 0,
      totalSize: 0,
      oldestEntry: null,
      newestEntry: null,
    };
  }
}

/**
 * Check if a lap is cached
 * 
 * @param trackId - Track identifier
 * @param driverNumber - Driver number
 * @param lapNumber - Lap number
 * @returns True if the lap is cached
 */
export async function isCached(
  trackId: string,
  driverNumber: number,
  lapNumber: number
): Promise<boolean> {
  try {
    const db = await getDB();
    const key = generateCacheKey(trackId, driverNumber, lapNumber);
    const entry = await db.get(STORE_NAME, key);
    return entry !== undefined;
  } catch (error) {
    console.error('Failed to check cache:', error);
    return false;
  }
}

/**
 * Get all cached lap keys for a specific track
 * 
 * @param trackId - Track identifier
 * @returns Array of cache keys
 */
export async function getCachedLapKeys(trackId: string): Promise<string[]> {
  try {
    const db = await getDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const index = tx.store.index('trackId');
    
    const entries = await index.getAll(IDBKeyRange.only(trackId)) as CacheEntry[];
    await tx.done;
    
    return entries.map(e => e.key);
  } catch (error) {
    console.error('Failed to get cached lap keys:', error);
    return [];
  }
}


