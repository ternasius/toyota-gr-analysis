/**
 * Performance Monitoring Utility
 * 
 * Monitors and logs performance metrics for the Race Telemetry Dashboard.
 * Helps verify that requirements are met:
 * - Requirement 1.1: Initial load < 2s
 * - Requirement 2.2: Track data load < 1s
 * - Requirement 2.5: Driver selection update < 500ms
 * 
 * Task 19.3: Performance testing and optimization
 */

interface PerformanceMetric {
  name: string;
  duration: number;
  timestamp: number;
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private marks: Map<string, number> = new Map();

  /**
   * Start timing an operation
   */
  startMark(name: string): void {
    this.marks.set(name, performance.now());
  }

  /**
   * End timing an operation and record the metric
   */
  endMark(name: string): number | null {
    const startTime = this.marks.get(name);
    if (!startTime) {
      console.warn(`Performance mark "${name}" not found`);
      return null;
    }

    const duration = performance.now() - startTime;
    this.marks.delete(name);

    this.metrics.push({
      name,
      duration,
      timestamp: Date.now(),
    });

    // Log to console in development
    if (import.meta.env.DEV) {
      console.log(`⏱️ ${name}: ${duration.toFixed(2)}ms`);
    }

    return duration;
  }

  /**
   * Measure a function execution time
   */
  async measure<T>(name: string, fn: () => Promise<T>): Promise<T> {
    this.startMark(name);
    try {
      const result = await fn();
      this.endMark(name);
      return result;
    } catch (error) {
      this.endMark(name);
      throw error;
    }
  }

  /**
   * Get all recorded metrics
   */
  getMetrics(): PerformanceMetric[] {
    return [...this.metrics];
  }

  /**
   * Get metrics by name pattern
   */
  getMetricsByName(pattern: string): PerformanceMetric[] {
    return this.metrics.filter(m => m.name.includes(pattern));
  }

  /**
   * Get average duration for a metric name
   */
  getAverageDuration(name: string): number | null {
    const matchingMetrics = this.getMetricsByName(name);
    if (matchingMetrics.length === 0) return null;

    const sum = matchingMetrics.reduce((acc, m) => acc + m.duration, 0);
    return sum / matchingMetrics.length;
  }

  /**
   * Check if a metric meets a performance requirement
   */
  checkRequirement(name: string, maxDuration: number): boolean {
    const metrics = this.getMetricsByName(name);
    if (metrics.length === 0) {
      console.warn(`No metrics found for "${name}"`);
      return false;
    }

    const latestMetric = metrics[metrics.length - 1];
    const passed = latestMetric.duration <= maxDuration;

    if (!passed) {
      console.warn(
        `⚠️ Performance requirement failed: ${name} took ${latestMetric.duration.toFixed(2)}ms (max: ${maxDuration}ms)`
      );
    }

    return passed;
  }

  /**
   * Get memory usage (if available)
   */
  getMemoryUsage(): { used: number; total: number; limit: number } | null {
    if ('memory' in performance && (performance as any).memory) {
      const memory = (performance as any).memory;
      return {
        used: memory.usedJSHeapSize / (1024 * 1024), // MB
        total: memory.totalJSHeapSize / (1024 * 1024), // MB
        limit: memory.jsHeapSizeLimit / (1024 * 1024), // MB
      };
    }
    return null;
  }

  /**
   * Log a performance summary
   */
  logSummary(): void {
    console.group('📊 Performance Summary');

    // Initial load time
    const initialLoad = this.getMetricsByName('initial-load');
    if (initialLoad.length > 0) {
      const duration = initialLoad[0].duration;
      const passed = duration <= 2000;
      console.log(
        `${passed ? '✅' : '❌'} Initial Load: ${duration.toFixed(2)}ms (requirement: < 2000ms)`
      );
    }

    // Track load time
    const trackLoad = this.getMetricsByName('track-load');
    if (trackLoad.length > 0) {
      const avgDuration = this.getAverageDuration('track-load');
      const passed = avgDuration !== null && avgDuration <= 1000;
      console.log(
        `${passed ? '✅' : '❌'} Track Load (avg): ${avgDuration?.toFixed(2)}ms (requirement: < 1000ms)`
      );
    }

    // Driver selection time
    const driverSelection = this.getMetricsByName('driver-selection');
    if (driverSelection.length > 0) {
      const avgDuration = this.getAverageDuration('driver-selection');
      const passed = avgDuration !== null && avgDuration <= 500;
      console.log(
        `${passed ? '✅' : '❌'} Driver Selection (avg): ${avgDuration?.toFixed(2)}ms (requirement: < 500ms)`
      );
    }

    // Memory usage
    const memory = this.getMemoryUsage();
    if (memory) {
      const passed = memory.used <= 500;
      console.log(
        `${passed ? '✅' : '❌'} Memory Usage: ${memory.used.toFixed(2)}MB (requirement: < 500MB)`
      );
      console.log(`   Total: ${memory.total.toFixed(2)}MB, Limit: ${memory.limit.toFixed(2)}MB`);
    }

    console.groupEnd();
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.metrics = [];
    this.marks.clear();
  }
}

// Export singleton instance
export const performanceMonitor = new PerformanceMonitor();

// Expose to window for debugging in development
if (import.meta.env.DEV && typeof window !== 'undefined') {
  (window as any).performanceMonitor = performanceMonitor;
}
