/**
 * Application Configuration
 * 
 * Centralized configuration management for environment variables
 * and application settings. This file provides type-safe access to
 * configuration values across the application.
 * 
 * Task 17.1: Configure environment variables
 */

export interface AppConfig {
  // Data Configuration
  dataBaseUrl: string;
  
  // Performance Configuration
  maxCacheSize: number;
  workerPoolSize: number;
  maxSelectedDrivers: number;
  downsampleThreshold: number;
  maxUploadSizeBytes: number;
  fetchTimeoutMs: number;
  zoomDebounceMs: number;
  
  // Feature Flags
  enableAnalytics: boolean;
  enableDebug: boolean;
  
  // Build Information
  version: string;
  buildTime: string;
  
  // Environment
  isDevelopment: boolean;
  isProduction: boolean;
}

/**
 * Parse environment variable as number with fallback
 */
function getEnvNumber(key: string, fallback: number): number {
  const value = import.meta.env[key];
  if (value === undefined || value === '') return fallback;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? fallback : parsed;
}

/**
 * Parse environment variable as boolean with fallback
 */
function getEnvBoolean(key: string, fallback: boolean): boolean {
  const value = import.meta.env[key];
  if (value === undefined || value === '') return fallback;
  return value === 'true' || value === '1';
}

/**
 * Application configuration object
 * All configuration values are loaded from environment variables
 * with sensible defaults.
 */
export const config: AppConfig = {
  // Data Configuration
  dataBaseUrl: import.meta.env.VITE_DATA_BASE_URL || '/datasets_trimmed',
  
  // Performance Configuration
  maxCacheSize: getEnvNumber('VITE_MAX_CACHE_SIZE', 100 * 1024 * 1024), // 100 MB
  workerPoolSize: getEnvNumber('VITE_WORKER_POOL_SIZE', navigator.hardwareConcurrency || 4),
  maxSelectedDrivers: getEnvNumber('VITE_MAX_SELECTED_DRIVERS', 5),
  downsampleThreshold: getEnvNumber('VITE_DOWNSAMPLE_THRESHOLD', 2000),
  maxUploadSizeBytes: getEnvNumber('VITE_MAX_UPLOAD_SIZE_BYTES', 50 * 1024 * 1024), // 50 MB
  fetchTimeoutMs: getEnvNumber('VITE_FETCH_TIMEOUT_MS', 30000), // 30 seconds
  zoomDebounceMs: getEnvNumber('VITE_ZOOM_DEBOUNCE_MS', 100), // 100ms
  
  // Feature Flags
  enableAnalytics: getEnvBoolean('VITE_ENABLE_ANALYTICS', false),
  enableDebug: getEnvBoolean('VITE_ENABLE_DEBUG', import.meta.env.DEV),
  
  // Build Information
  version: (globalThis as any).__APP_VERSION__ || '0.0.0',
  buildTime: (globalThis as any).__BUILD_TIME__ || new Date().toISOString(),
  
  // Environment
  isDevelopment: import.meta.env.DEV,
  isProduction: import.meta.env.PROD,
};

/**
 * Log configuration on startup (development only)
 */
if (config.isDevelopment && config.enableDebug) {
  console.log('🏁 Race Telemetry Dashboard Configuration:', {
    version: config.version,
    buildTime: config.buildTime,
    dataBaseUrl: config.dataBaseUrl,
    environment: config.isDevelopment ? 'development' : 'production',
  });
}

export default config;
