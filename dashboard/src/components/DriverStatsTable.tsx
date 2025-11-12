/**
 * DriverStatsTable Component
 * 
 * Displays driver statistics table with columns:
 * - Driver, Best Lap, Avg Lap, StdDev, S1, S2, S3, Theoretical Best
 * Highlights fastest value in each column.
 * Makes rows clickable to select driver.
 * Implements responsive table layout.
 * 
 * Requirements: 4.2, 4.3, 4.4
 */

import { useMemo, useState } from 'react';
import { TrendingDown, Award, Download } from 'lucide-react';
import { useDashboardStore } from '../store/useDashboardStore';
import type { DriverStats } from '../types/data';

/**
 * Format lap time in seconds to MM:SS.mmm format
 */
function formatLapTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}:${secs.toFixed(3).padStart(6, '0')}`;
}

/**
 * Format sector time in seconds to SS.mmm format
 */
function formatSectorTime(seconds: number): string {
  return seconds.toFixed(3);
}

/**
 * Column definition for the stats table
 */
interface ColumnDef {
  key: keyof DriverStats | 'driver';
  label: string;
  format: (value: any, driver: DriverStats) => string;
  align?: 'left' | 'center' | 'right';
  className?: string;
}

const columns: ColumnDef[] = [
  {
    key: 'driver',
    label: 'DRIVER',
    format: (_, driver) => `#${driver.NUMBER}`,
    align: 'left',
    className: 'font-bold',
  },
  {
    key: 'BestLap(s)',
    label: 'BEST LAP',
    format: (value) => formatLapTime(value),
    align: 'right',
    className: 'font-mono',
  },
  {
    key: 'AvgLap(s)',
    label: 'AVG LAP',
    format: (value) => formatLapTime(value),
    align: 'right',
    className: 'font-mono',
  },
  {
    key: 'StdDev(s)',
    label: 'STDDEV',
    format: (value) => value.toFixed(3),
    align: 'right',
    className: 'font-mono',
  },
  {
    key: 'S1Best',
    label: 'S1',
    format: (value) => formatSectorTime(value),
    align: 'right',
    className: 'font-mono text-sm',
  },
  {
    key: 'S2Best',
    label: 'S2',
    format: (value) => formatSectorTime(value),
    align: 'right',
    className: 'font-mono text-sm',
  },
  {
    key: 'S3Best',
    label: 'S3',
    format: (value) => formatSectorTime(value),
    align: 'right',
    className: 'font-mono text-sm',
  },
  {
    key: 'TheoreticalBest(s)',
    label: 'THEO. BEST',
    format: (value) => formatLapTime(value),
    align: 'right',
    className: 'font-mono',
  },
];

export function DriverStatsTable() {
  const { driverStats, selectedLaps, exportDriverStats } = useDashboardStore();
  
  // Get unique driver numbers from selected laps
  const selectedDriverNumbers = Array.from(new Set(selectedLaps.map(lap => lap.driverNumber)));
  const [isExporting, setIsExporting] = useState(false);

  // Sort drivers by best lap time
  const sortedDrivers = useMemo(() => {
    return [...driverStats].sort((a, b) => a['BestLap(s)'] - b['BestLap(s)']);
  }, [driverStats]);

  // Find fastest value in each column (Requirement 4.3)
  const fastestValues = useMemo(() => {
    if (driverStats.length === 0) {
      return {
        'BestLap(s)': Infinity,
        'AvgLap(s)': Infinity,
        'StdDev(s)': Infinity,
        S1Best: Infinity,
        S2Best: Infinity,
        S3Best: Infinity,
        'TheoreticalBest(s)': Infinity,
      };
    }

    return {
      'BestLap(s)': Math.min(...driverStats.map(d => d['BestLap(s)'])),
      'AvgLap(s)': Math.min(...driverStats.map(d => d['AvgLap(s)'])),
      'StdDev(s)': Math.min(...driverStats.map(d => d['StdDev(s)'])),
      S1Best: Math.min(...driverStats.map(d => d.S1Best)),
      S2Best: Math.min(...driverStats.map(d => d.S2Best)),
      S3Best: Math.min(...driverStats.map(d => d.S3Best)),
      'TheoreticalBest(s)': Math.min(...driverStats.map(d => d['TheoreticalBest(s)'])),
    };
  }, [driverStats]);

  /**
   * Check if a value is the fastest in its column
   */
  const isFastest = (key: keyof DriverStats, value: number): boolean => {
    const fastestValue = fastestValues[key as keyof typeof fastestValues];
    return fastestValue === value;
  };

  // Row clicks disabled - users should select from "Select Times" card instead

  /**
   * Handle export button click (Requirement 8.5)
   */
  const handleExport = async () => {
    try {
      setIsExporting(true);
      exportDriverStats();
    } catch (error) {
      console.error('Failed to export driver statistics:', error);
      alert('Failed to export driver statistics. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  if (driverStats.length === 0) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-8">
        <div className="text-center text-gray-500">
          <Award size={32} className="mx-auto mb-2 opacity-50" />
          <p className="text-sm">Select a track to view driver statistics</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="text-xs uppercase tracking-wide text-gray-400 font-bold">
            DRIVER STATISTICS
          </div>
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="
              flex items-center gap-1.5 px-3 py-1.5 
              bg-racing-red/10 hover:bg-racing-red/20 
              border border-racing-red/30 hover:border-racing-red/50
              rounded text-xs text-racing-red font-medium
              transition-all disabled:opacity-50 disabled:cursor-not-allowed
            "
            title="Export driver statistics to CSV"
          >
            <Download size={12} />
            <span>{isExporting ? 'Exporting...' : 'Export CSV'}</span>
          </button>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <TrendingDown size={14} className="text-racing-red" />
          <span className="hidden sm:inline">Best lap times</span>
        </div>
      </div>

      {/* Table - Desktop View (also shown on tablet in compact mode) */}
      <div className="hidden md:block overflow-x-auto" style={{ overflowX: 'auto', position: 'relative' }}>
        <table className="w-full min-w-[800px]">
          <thead>
            <tr className="bg-gray-800/50 border-b border-gray-800">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`
                    px-2 md:px-4 py-2 md:py-3 text-xs uppercase tracking-wide text-gray-400 font-bold
                    ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'}
                  `}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedDrivers.map((driver, index) => {
              const isSelected = selectedDriverNumbers.includes(driver.NUMBER);
              
              return (
                <tr
                  key={`driver_${driver.NUMBER}_${driver.SOURCE_DIR || index}`}
                  className={`
                    border-b border-gray-800 transition-all
                    ${isSelected 
                      ? 'bg-racing-red/10' 
                      : ''
                    }
                    ${index === 0 ? 'bg-racing-red/5' : ''}
                  `}
                >
                  {columns.map((col) => {
                    const value = col.key === 'driver' ? driver.NUMBER : driver[col.key as keyof DriverStats];
                    const formattedValue = col.format(value, driver);
                    const isFastestValue = col.key !== 'driver' && isFastest(col.key as keyof DriverStats, value as number);

                    return (
                      <td
                        key={col.key}
                        className={`
                          px-2 md:px-4 py-2 md:py-3 text-xs md:text-sm
                          ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'}
                          ${col.className || ''}
                          ${isFastestValue ? 'text-racing-red font-bold' : 'text-white'}
                          ${isSelected && col.key === 'driver' ? 'text-racing-red' : ''}
                        `}
                      >
                        <div className="flex items-center gap-1 md:gap-2 justify-end">
                          {isFastestValue && (
                            <Award size={10} className="text-racing-red md:w-3 md:h-3" />
                          )}
                          <span>{formattedValue}</span>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Table - Mobile View (Card-based) */}
      <div className="md:hidden divide-y divide-gray-800">
        {sortedDrivers.map((driver, index) => {
          const isSelected = selectedDriverNumbers.includes(driver.NUMBER);
          
          return (
            <div
              key={`driver_${driver.NUMBER}_${driver.SOURCE_DIR || index}`}
              className={`
                p-4 transition-all
                ${isSelected 
                  ? 'bg-racing-red/10' 
                  : ''
                }
                ${index === 0 ? 'bg-racing-red/5' : ''}
              `}
            >
              {/* Driver Header */}
              <div className="flex items-center justify-between mb-3">
                <div className={`text-lg font-bold ${isSelected ? 'text-racing-red' : 'text-white'}`}>
                  Driver #{driver.NUMBER}
                </div>
                {index === 0 && (
                  <Award size={16} className="text-racing-red" />
                )}
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-xs text-gray-400 uppercase mb-1">Best Lap</div>
                  <div className={`font-mono ${isFastest('BestLap(s)', driver['BestLap(s)']) ? 'text-racing-red font-bold' : 'text-white'}`}>
                    {formatLapTime(driver['BestLap(s)'])}
                  </div>
                </div>
                
                <div>
                  <div className="text-xs text-gray-400 uppercase mb-1">Avg Lap</div>
                  <div className={`font-mono ${isFastest('AvgLap(s)', driver['AvgLap(s)']) ? 'text-racing-red font-bold' : 'text-white'}`}>
                    {formatLapTime(driver['AvgLap(s)'])}
                  </div>
                </div>
                
                <div>
                  <div className="text-xs text-gray-400 uppercase mb-1">StdDev</div>
                  <div className={`font-mono ${isFastest('StdDev(s)', driver['StdDev(s)']) ? 'text-racing-red font-bold' : 'text-white'}`}>
                    {driver['StdDev(s)'].toFixed(3)}
                  </div>
                </div>
                
                <div>
                  <div className="text-xs text-gray-400 uppercase mb-1">Theo. Best</div>
                  <div className={`font-mono ${isFastest('TheoreticalBest(s)', driver['TheoreticalBest(s)']) ? 'text-racing-red font-bold' : 'text-white'}`}>
                    {formatLapTime(driver['TheoreticalBest(s)'])}
                  </div>
                </div>
              </div>

              {/* Sectors */}
              <div className="mt-3 pt-3 border-t border-gray-800">
                <div className="text-xs text-gray-400 uppercase mb-2">Sectors</div>
                <div className="flex gap-4 text-sm">
                  <div>
                    <span className="text-gray-400">S1:</span>{' '}
                    <span className={`font-mono ${isFastest('S1Best', driver.S1Best) ? 'text-racing-red font-bold' : 'text-white'}`}>
                      {formatSectorTime(driver.S1Best)}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400">S2:</span>{' '}
                    <span className={`font-mono ${isFastest('S2Best', driver.S2Best) ? 'text-racing-red font-bold' : 'text-white'}`}>
                      {formatSectorTime(driver.S2Best)}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400">S3:</span>{' '}
                    <span className={`font-mono ${isFastest('S3Best', driver.S3Best) ? 'text-racing-red font-bold' : 'text-white'}`}>
                      {formatSectorTime(driver.S3Best)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
