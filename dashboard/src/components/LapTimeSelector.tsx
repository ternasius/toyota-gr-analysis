/**
 * LapTimeSelector Component
 * 
 * Displays the top 10 fastest lap times for selection and comparison.
 * Users can select up to 5 laps to visualize on the telemetry charts.
 * 
 * Requirements: 2.3, 2.4, 2.5
 */

import { useMemo } from 'react';
import { Clock, X } from 'lucide-react';
import { useDashboardStore } from '../store/useDashboardStore';
import { config } from '../config';

/**
 * Color palette for lap chips (matches chart colors)
 */
const LAP_COLORS = [
  '#C8102E', // Toyota Red
  '#00A3E0', // Blue
  '#FFB81C', // Yellow
  '#00B140', // Green
  '#9B26B6', // Purple
];

/**
 * Format lap time in seconds to MM:SS.mmm format
 */
function formatLapTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}:${secs.toFixed(3).padStart(6, '0')}`;
}

export function LapTimeSelector() {
  const { lapTimes, selectedLaps, toggleLap } = useDashboardStore();

  // Get top 10 fastest laps with unique identifiers
  const top10Laps = useMemo(() => {
    return lapTimes.slice(0, 10).map((lap, index) => ({
      ...lap,
      uniqueId: `driver_${lap.NUMBER}_lap_${lap.LAP_NUMBER}_race_${lap.SOURCE_DIR || index}`, // Unique ID
      rank: index + 1,
    }));
  }, [lapTimes]);

  // Track which laps are selected
  const selectedLapIndices = useMemo(() => {
    return top10Laps
      .map((lap, idx) => {
        const isSelected = selectedLaps.some(
          selected => selected.driverNumber === lap.NUMBER && 
                     selected.lapNumber === lap.LAP_NUMBER && 
                     selected.sourceDir === lap.SOURCE_DIR
        );
        return isSelected ? idx : -1;
      })
      .filter(idx => idx !== -1);
  }, [selectedLaps, top10Laps]);

  // Check if max selection reached
  const isMaxSelected = selectedLaps.length >= config.maxSelectedDrivers;

  const handleLapClick = (lap: typeof top10Laps[0]) => {
    // Check if this specific lap is already selected
    const isSelected = selectedLaps.some(
      selected => selected.driverNumber === lap.NUMBER && 
                 selected.lapNumber === lap.LAP_NUMBER && 
                 selected.sourceDir === lap.SOURCE_DIR
    );
    
    // Allow deselection or selection if under max
    if (isSelected || !isMaxSelected) {
      toggleLap(lap.NUMBER, lap.LAP_NUMBER, lap.SOURCE_DIR);
    }
  };

  const handleRemoveLap = (lap: typeof top10Laps[0], e: React.MouseEvent) => {
    e.stopPropagation();
    toggleLap(lap.NUMBER, lap.LAP_NUMBER, lap.SOURCE_DIR);
  };

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="telemetry-label text-xs">
          SELECT TIMES
        </div>
        <div className="text-xs text-gray-500">
          {selectedLaps.length}/{config.maxSelectedDrivers}
        </div>
      </div>

      {/* Selected Laps Chips */}
      {selectedLapIndices.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4 pb-4 border-b border-gray-800">
          {selectedLapIndices.map((lapIndex) => {
            const lap = top10Laps[lapIndex];
            const color = LAP_COLORS[selectedLapIndices.indexOf(lapIndex) % LAP_COLORS.length];
            
            return (
              <div
                key={lap.uniqueId}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-bold transition-all hover:scale-105"
                style={{
                  backgroundColor: `${color}20`,
                  borderColor: color,
                  borderWidth: '2px',
                  color: color,
                }}
              >
                <span>#{lap.NUMBER}</span>
                <span className="text-xs opacity-75">L{lap.LAP_NUMBER}</span>
                <span className="text-xs opacity-75 numeric-value">
                  {formatLapTime(lap.LAP_TIME_SEC)}
                </span>
                <button
                  onClick={(e) => handleRemoveLap(lap, e)}
                  className="hover:opacity-70 transition-opacity"
                  aria-label={`Remove lap ${lap.LAP_NUMBER} for driver ${lap.NUMBER}`}
                >
                  <X size={14} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Max Selection Warning */}
      {isMaxSelected && (
        <div className="mb-3 px-3 py-2 bg-racing-red/10 border border-racing-red/30 rounded text-xs text-racing-red">
          Maximum {config.maxSelectedDrivers} laps selected. Remove one to select another.
        </div>
      )}

      {/* Top 10 Fastest Laps List */}
      <div className="space-y-1 max-h-96 overflow-y-auto">
        {top10Laps.length === 0 ? (
          <div className="text-center py-8 text-gray-500 text-sm">
            <Clock size={32} className="mx-auto mb-2 opacity-50" />
            <p>Select a track to view lap times</p>
          </div>
        ) : (
          top10Laps.map((lap, index) => {
            const isSelected = selectedLaps.some(
              selected => selected.driverNumber === lap.NUMBER && 
                         selected.lapNumber === lap.LAP_NUMBER && 
                         selected.sourceDir === lap.SOURCE_DIR
            );
            const isDisabled = !isSelected && isMaxSelected;
            const lapIndexInSelected = selectedLapIndices.indexOf(index);
            const color = lapIndexInSelected !== -1 ? LAP_COLORS[lapIndexInSelected % LAP_COLORS.length] : '#6B7280';

            return (
              <button
                key={lap.uniqueId}
                onClick={() => handleLapClick(lap)}
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
                aria-label={`${isSelected ? 'Deselect' : 'Select'} lap ${lap.LAP_NUMBER} for driver ${lap.NUMBER}`}
              >
                <div className="flex items-center gap-3 flex-1">
                  <div 
                    className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                    style={{
                      backgroundColor: isSelected ? `${color}30` : '#374151',
                      color: isSelected ? color : '#9CA3AF',
                    }}
                  >
                    {lap.rank}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white">
                        Driver #{lap.NUMBER}
                      </span>
                      <span className="text-xs text-gray-500">
                        Lap {lap.LAP_NUMBER}
                      </span>
                    </div>
                    <div className="text-sm numeric-value text-racing-red font-bold">
                      {formatLapTime(lap.LAP_TIME_SEC)}
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
    </div>
  );
}
