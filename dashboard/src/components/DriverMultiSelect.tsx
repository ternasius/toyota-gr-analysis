/**
 * DriverMultiSelect Component
 * 
 * Multi-select interface for choosing drivers with chip-based display.
 * Limits selection to 5 drivers maximum.
 * Color-codes driver chips to match chart colors.
 * Sorts drivers by best lap time.
 * Implements search/filter functionality.
 * 
 * Requirements: 2.3, 2.4, 2.5
 */

import { useMemo, useState } from 'react';
import { X, Search, User } from 'lucide-react';
import { useDashboardStore } from '../store/useDashboardStore';
import { config } from '../config';

/**
 * Color palette for driver chips (matches chart colors)
 */
const DRIVER_COLORS = [
  '#C8102E', // Toyota Red
  '#00A3E0', // Blue
  '#FFB81C', // Yellow
  '#00B140', // Green
  '#9B26B6', // Purple
];

/**
 * Get color for a driver based on their selection index
 */
function getDriverColor(driverNumber: number, selectedDrivers: number[]): string {
  const index = selectedDrivers.indexOf(driverNumber);
  if (index === -1) return '#6B7280'; // Gray for unselected
  return DRIVER_COLORS[index % DRIVER_COLORS.length];
}

/**
 * Format lap time in seconds to MM:SS.mmm format
 */
function formatLapTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}:${secs.toFixed(3).padStart(6, '0')}`;
}

export function DriverMultiSelect() {
  const { driverStats, selectedLaps } = useDashboardStore();
  const [searchQuery, setSearchQuery] = useState('');

  // Sort drivers by best lap time (Requirement 2.3)
  const sortedDrivers = useMemo(() => {
    return [...driverStats].sort((a, b) => a['BestLap(s)'] - b['BestLap(s)']);
  }, [driverStats]);

  // Filter drivers based on search query
  const filteredDrivers = useMemo(() => {
    if (!searchQuery.trim()) return sortedDrivers;
    
    const query = searchQuery.toLowerCase();
    return sortedDrivers.filter(driver => 
      driver.NUMBER.toString().includes(query)
    );
  }, [sortedDrivers, searchQuery]);

  // Check if max selection reached (Requirement 2.4)
  const isMaxSelected = selectedLaps.length >= config.maxSelectedDrivers;
  
  // Get unique driver numbers from selected laps
  const selectedDriverNumbers = Array.from(new Set(selectedLaps.map(lap => lap.driverNumber)));

  // NOTE: This component is deprecated in favor of LapTimeSelector
  // which provides lap-based selection instead of driver-based selection
  const handleDriverClick = (_driverNumber: number) => {
    console.warn('DriverMultiSelect is deprecated. Use LapTimeSelector instead.');
  };

  const handleRemoveDriver = (_driverNumber: number, e: React.MouseEvent) => {
    e.stopPropagation();
    console.warn('DriverMultiSelect is deprecated. Use LapTimeSelector instead.');
  };

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="text-xs uppercase tracking-wide text-gray-400 font-bold">
          SELECT DRIVERS
        </div>
        <div className="text-xs text-gray-500">
          {selectedLaps.length}/{config.maxSelectedDrivers}
        </div>
      </div>

      {/* Selected Drivers Chips */}
      {selectedDriverNumbers.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4 pb-4 border-b border-gray-800">
          {selectedDriverNumbers.map((driverNumber) => {
            const driver = driverStats.find(d => d.NUMBER === driverNumber);
            const color = getDriverColor(driverNumber, selectedDriverNumbers);
            
            return (
              <div
                key={driverNumber}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-bold transition-all hover:scale-105"
                style={{
                  backgroundColor: `${color}20`,
                  borderColor: color,
                  borderWidth: '2px',
                  color: color,
                }}
              >
                <span>#{driverNumber}</span>
                {driver && (
                  <span className="text-xs opacity-75 font-mono">
                    {formatLapTime(driver['BestLap(s)'])}
                  </span>
                )}
                <button
                  onClick={(e) => handleRemoveDriver(driverNumber, e)}
                  className="hover:opacity-70 transition-opacity"
                  aria-label={`Remove driver ${driverNumber}`}
                >
                  <X size={14} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Search Input */}
      <div className="relative mb-3">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
        <input
          type="text"
          placeholder="Search driver number..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-10 pr-4 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-racing-red transition-colors"
        />
      </div>

      {/* Max Selection Warning */}
      {isMaxSelected && (
        <div className="mb-3 px-3 py-2 bg-racing-red/10 border border-racing-red/30 rounded text-xs text-racing-red">
          Maximum {config.maxSelectedDrivers} drivers selected. Remove one to select another.
        </div>
      )}

      {/* Driver List */}
      <div className="space-y-1 max-h-96 overflow-y-auto">
        {filteredDrivers.length === 0 ? (
          <div className="text-center py-8 text-gray-500 text-sm">
            {searchQuery ? 'No drivers found' : 'No drivers available'}
          </div>
        ) : (
          filteredDrivers.map((driver) => {
            const isSelected = selectedDriverNumbers.includes(driver.NUMBER);
            const isDisabled = !isSelected && isMaxSelected;
            const color = getDriverColor(driver.NUMBER, selectedDriverNumbers);

            return (
              <button
                key={driver.NUMBER}
                onClick={() => handleDriverClick(driver.NUMBER)}
                disabled={isDisabled}
                className={`
                  w-full flex items-center justify-between px-3 py-3 md:py-2.5 rounded-lg text-left transition-all
                  min-h-[44px]
                  ${isSelected 
                    ? 'bg-gray-800 border-2' 
                    : 'bg-gray-800/50 border border-gray-700 hover:bg-gray-800'
                  }
                  ${isDisabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}
                `}
                style={isSelected ? { borderColor: color } : {}}
                aria-label={`${isSelected ? 'Deselect' : 'Select'} driver ${driver.NUMBER}`}
              >
                <div className="flex items-center gap-3">
                  <div 
                    className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                    style={{
                      backgroundColor: isSelected ? `${color}30` : '#374151',
                      color: isSelected ? color : '#9CA3AF',
                    }}
                  >
                    <User size={14} />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white">
                      Driver #{driver.NUMBER}
                    </div>
                    <div className="text-xs text-gray-400 font-mono">
                      Best: {formatLapTime(driver['BestLap(s)'])}
                    </div>
                  </div>
                </div>
                
                {isSelected && (
                  <div 
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: color }}
                  />
                )}
              </button>
            );
          })
        )}
      </div>

      {/* Empty State */}
      {driverStats.length === 0 && (
        <div className="text-center py-8 text-gray-500 text-sm">
          <User size={32} className="mx-auto mb-2 opacity-50" />
          <p>Select a track to view drivers</p>
        </div>
      )}
    </div>
  );
}
