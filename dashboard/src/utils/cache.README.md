# IndexedDB Cache Implementation

## Overview

The cache module provides persistent storage for lap telemetry data using IndexedDB. This significantly improves performance by avoiding redundant network requests for previously loaded laps.

## Features

- **Persistent Storage**: Data survives page refreshes and browser restarts
- **LRU Eviction**: Automatically removes oldest entries when cache exceeds 20 laps
- **Efficient Queries**: Indexed by track, driver, and timestamp for fast lookups
- **Size Tracking**: Monitors cache size to prevent excessive storage usage
- **Error Handling**: Graceful degradation when IndexedDB is unavailable

## Cache Key Structure

Cache keys follow the format: `{trackId}_{driverNumber}_{lapNumber}`

Examples:
- `barber_top10_22_11` - Barber track, driver 22, lap 11
- `cota_top10_13_8` - COTA track, driver 13, lap 8

## Usage

### Basic Operations

```typescript
import { 
  getCachedLap, 
  setCachedLap, 
  deleteCachedLap,
  isCached 
} from '../utils/cache';

// Check if a lap is cached
const cached = await isCached('barber_top10', 22, 11);

// Get cached lap data
const lapData = await getCachedLap('barber_top10', 22, 11);

// Store lap data in cache
await setCachedLap('barber_top10', 22, 11, telemetryData);

// Delete specific lap from cache
await deleteCachedLap('barber_top10', 22, 11);
```

### Cache Management

```typescript
import { 
  getCacheStats, 
  clearTrackCache, 
  clearAllCache 
} from '../utils/cache';

// Get cache statistics
const stats = await getCacheStats();
console.log(`Cache has ${stats.entryCount} entries, ${stats.totalSize} bytes`);

// Clear all laps for a specific track
await clearTrackCache('barber_top10');

// Clear entire cache
await clearAllCache();
```

## LRU Eviction Strategy

The cache implements a Least Recently Used (LRU) eviction strategy:

1. Maximum of 20 lap entries are kept in cache
2. Each time a lap is accessed, its timestamp is updated
3. When the 21st lap is added, the oldest (least recently accessed) lap is removed
4. This ensures frequently accessed laps remain cached

## Database Schema

**Database Name**: `telemetry-cache`  
**Version**: 1  
**Object Store**: `laps`

### Indexes

- `timestamp` - For LRU sorting
- `trackId` - For track-specific queries
- `driverNumber` - For driver-specific queries

### Entry Structure

```typescript
interface CacheEntry {
  key: string;                    // Primary key
  trackId: string;                // Track identifier
  driverNumber: number;           // Driver number
  lapNumber: number;              // Lap number
  data: LapTelemetry;             // Full telemetry data
  size: number;                   // Estimated size in bytes
  timestamp: number;              // Last access time (for LRU)
}
```

## Integration with Store

The cache is integrated into the Zustand store's `loadLapTelemetry` action:

1. Check if lap is already in memory → return immediately
2. Check if lap is in IndexedDB cache → load from cache
3. If not cached → fetch from server, parse, and cache
4. Store in memory for immediate access

This three-tier approach (memory → cache → network) provides optimal performance.

## Error Handling

The cache module handles errors gracefully:

- **IndexedDB unavailable**: Falls back to network-only mode
- **Quota exceeded**: Logs warning and continues without caching
- **Corrupt data**: Returns null and logs error
- **Connection terminated**: Automatically reconnects on next operation

## Performance Considerations

- **Cache Hit**: ~5-10ms (IndexedDB read)
- **Cache Miss**: ~500-2000ms (network fetch + parse)
- **Storage Overhead**: ~200 bytes per telemetry point
- **Typical Lap Size**: 2-5 MB (10,000-25,000 points)

## Browser Compatibility

IndexedDB is supported in all modern browsers:
- Chrome 24+
- Firefox 16+
- Safari 10+
- Edge 12+

## Future Enhancements

- Compression of cached data (gzip)
- Configurable cache size limits
- Cache warming (preload popular laps)
- Service Worker integration for offline support
- Cache versioning for data format changes
