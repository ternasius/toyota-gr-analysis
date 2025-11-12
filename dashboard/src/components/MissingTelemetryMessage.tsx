/**
 * MissingTelemetryMessage Component
 * 
 * Displays an inline message when telemetry data is unavailable for a selected driver.
 * Suggests alternative laps with available telemetry.
 * 
 * Requirements: 7.2, 7.5
 */

import { AlertCircle } from 'lucide-react';
import type { LapTime } from '../types/data';

interface MissingTelemetryMessageProps {
  driverNumber: number;
  lapNumber?: number;
  availableLaps?: LapTime[];
  onSelectLap?: (lapNumber: number) => void;
}

export function MissingTelemetryMessage({
  driverNumber,
  lapNumber,
  availableLaps = [],
  onSelectLap,
}: MissingTelemetryMessageProps) {
  // Filter available laps for this driver
  const driverLaps = availableLaps.filter(lap => lap.NUMBER === driverNumber);
  
  // Get top 3 alternative laps
  const alternativeLaps = driverLaps
    .sort((a, b) => a.LAP_TIME_SEC - b.LAP_TIME_SEC)
    .slice(0, 3);
  
  return (
    <div className="bg-yellow-900/20 border border-yellow-600/50 rounded-lg p-4">
      <div className="flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
        
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-yellow-400 mb-1">
            Telemetry Data Unavailable
          </h3>
          
          <p className="text-xs text-gray-300 mb-3">
            {lapNumber 
              ? `Telemetry data for Driver #${driverNumber}, Lap ${lapNumber} is not available.`
              : `Telemetry data for Driver #${driverNumber} is not available.`
            }
            {' '}Lap time data is still displayed below.
          </p>
          
          {alternativeLaps.length > 0 && (
            <div>
              <p className="text-xs text-gray-400 mb-2">
                Try these laps with available telemetry:
              </p>
              
              <div className="flex flex-wrap gap-2">
                {alternativeLaps.map((lap) => (
                  <button
                    key={lap.LAP_NUMBER}
                    onClick={() => onSelectLap?.(lap.LAP_NUMBER)}
                    className="px-3 py-1 bg-yellow-900/30 hover:bg-yellow-900/50 border border-yellow-600/30 rounded text-xs text-yellow-300 transition-colors"
                  >
                    Lap {lap.LAP_NUMBER} ({lap.LAP_TIME_SEC.toFixed(3)}s)
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
