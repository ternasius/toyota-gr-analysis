/**
 * SummaryCards Component
 * 
 * Displays three summary cards showing key metrics:
 * - Fastest lap time with driver number
 * - Average top-10 lap time
 * - Track conditions (placeholder for now)
 * 
 * Updates within 200ms on track change.
 * Uses monospace font for lap times.
 * 
 * Requirements: 4.1, 4.5, 6.3
 */

import { useMemo } from 'react';
import { Trophy, TrendingUp } from 'lucide-react';
import { useDashboardStore } from '../store/useDashboardStore';

/**
 * Format lap time in seconds to MM:SS.mmm format
 */
function formatLapTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}:${secs.toFixed(3).padStart(6, '0')}`;
}

export function SummaryCards() {
  const { lapTimes, driverStats } = useDashboardStore();

  // Calculate fastest lap from driver stats (Requirement 4.1)
  const fastestLap = useMemo(() => {
    if (driverStats.length === 0) return null;
    
    const fastest = driverStats.reduce((prev, current) => 
      current['BestLap(s)'] < prev['BestLap(s)'] ? current : prev
    );
    
    return {
      time: fastest['BestLap(s)'],
      driver: fastest.NUMBER,
    };
  }, [driverStats]);

  // Calculate average top-10 lap time (Requirement 4.1)
  const averageTop10 = useMemo(() => {
    if (lapTimes.length === 0) return null;
    
    // Take up to 10 fastest laps
    const top10 = lapTimes.slice(0, Math.min(10, lapTimes.length));
    const sum = top10.reduce((acc, lap) => acc + lap.LAP_TIME_SEC, 0);
    const avg = sum / top10.length;
    
    return avg;
  }, [lapTimes]);



  return (
    <section className="px-3 py-3 md:px-4 md:py-4 fade-in" aria-label="Performance summary">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
        {/* Fastest Lap Card */}
        <article className="card-racing rounded-lg p-3 md:p-4 racing-stripe" aria-labelledby="fastest-lap-title">
          <div className="flex items-start justify-between mb-2">
            <h3 id="fastest-lap-title" className="telemetry-label text-xs">
              FASTEST LAP
            </h3>
            <Trophy size={16} className="text-racing-red md:w-[18px] md:h-[18px]" aria-hidden="true" />
          </div>
          
          {fastestLap ? (
            <>
              <div className="text-2xl md:text-3xl numeric-value font-bold text-white mb-1" aria-label={`Fastest lap time: ${formatLapTime(fastestLap.time)}`}>
                {formatLapTime(fastestLap.time)}
              </div>
              <div className="text-xs md:text-sm text-gray-400">
                Driver <span className="text-racing-red font-bold">#{fastestLap.driver}</span>
              </div>
            </>
          ) : (
            <div className="text-xl md:text-2xl numeric-value text-gray-600" aria-label="No lap time data available">
              --:--.---
            </div>
          )}
        </article>

        {/* Average Top-10 Card */}
        <article className="card-racing rounded-lg p-3 md:p-4 racing-stripe" aria-labelledby="avg-top10-title">
          <div className="flex items-start justify-between mb-2">
            <h3 id="avg-top10-title" className="telemetry-label text-xs">
              AVG TOP-10
            </h3>
            <TrendingUp size={16} className="text-racing-red md:w-[18px] md:h-[18px]" aria-hidden="true" />
          </div>
          
          {averageTop10 ? (
            <>
              <div className="text-2xl md:text-3xl numeric-value font-bold text-white mb-1" aria-label={`Average top 10 lap time: ${formatLapTime(averageTop10)}`}>
                {formatLapTime(averageTop10)}
              </div>
              <div className="text-xs md:text-sm text-gray-400">
                {Math.min(10, lapTimes.length)} laps averaged
              </div>
            </>
          ) : (
            <div className="text-xl md:text-2xl numeric-value text-gray-600" aria-label="No lap time data available">
              --:--.---
            </div>
          )}
        </article>
      </div>
    </section>
  );
}
