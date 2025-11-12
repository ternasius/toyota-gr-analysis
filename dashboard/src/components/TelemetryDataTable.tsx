/**
 * TelemetryDataTable Component
 * 
 * Accessible data table alternative for telemetry charts.
 * Provides screen reader users with access to chart data.
 * 
 * Requirements: 16.3 (Provide alternative text/data tables for charts)
 */

import type { LapTelemetry } from '../types/data';
import type { TelemetryChannel } from '../types/store';

interface TelemetryDataTableProps {
  data: Map<string, LapTelemetry>;
  selectedLaps: Array<{ driverNumber: number; lapNumber: number; sourceDir: string }>;
  channel: TelemetryChannel;
  sampleRate?: number; // Show every Nth point to keep table manageable
}

/**
 * Get the field name for a telemetry channel
 */
function getChannelField(channel: TelemetryChannel): string {
  switch (channel) {
    case 'speed':
      return 'speed';
    case 'throttle':
      return 'aps';
    case 'brake':
      return 'pbrake_f';
    case 'steering':
      return 'Steering_Angle';
    case 'rpm':
      return 'nmot';
    case 'gear':
      return 'gear';
    default:
      return 'speed';
  }
}

/**
 * Get the unit for a telemetry channel
 */
function getChannelUnit(channel: TelemetryChannel): string {
  switch (channel) {
    case 'speed':
      return 'km/h';
    case 'throttle':
      return '%';
    case 'brake':
      return 'bar';
    case 'steering':
      return '°';
    case 'rpm':
      return 'RPM';
    case 'gear':
      return '';
    default:
      return '';
  }
}

/**
 * Accessible data table for telemetry data
 * Hidden visually but available to screen readers
 */
export function TelemetryDataTable({
  data,
  selectedLaps,
  channel,
  sampleRate = 10,
}: TelemetryDataTableProps) {
  const fieldName = getChannelField(channel);
  const unit = getChannelUnit(channel);

  // Collect data for selected laps
  const driverData: Array<{
    driverNumber: number;
    lapNumber: number;
    points: Array<{ time: number; value: number | null }>;
  }> = [];

  selectedLaps.forEach(({ driverNumber, lapNumber, sourceDir }) => {
    const lapId = `${driverNumber}_${lapNumber}_${sourceDir}`;
    const lap = data.get(lapId);
    if (lap) {
      const points = lap.points
        .filter((_, index) => index % sampleRate === 0) // Sample data
        .map((point, index) => ({
          time: index * 0.1 * sampleRate, // Approximate time
          value: (point as any)[fieldName] ?? null,
        }));

      driverData.push({ driverNumber, lapNumber, points });
    }
  });

  if (driverData.length === 0) {
    return null;
  }

  // Find max length for table rows
  const maxLength = Math.max(...driverData.map((d) => d.points.length));

  return (
    <div className="sr-only">
      <h3>
        {channel.charAt(0).toUpperCase() + channel.slice(1)} Telemetry Data Table
      </h3>
      <p>
        This table provides the same data shown in the {channel} chart in an
        accessible format.
      </p>
      <table>
        <caption>
          {channel.charAt(0).toUpperCase() + channel.slice(1)} telemetry data
          for {selectedLaps.length} lap(s)
        </caption>
        <thead>
          <tr>
            <th scope="col">Time (seconds)</th>
            {driverData.map((driver) => (
              <th key={`${driver.driverNumber}_${driver.lapNumber}`} scope="col">
                Driver #{driver.driverNumber} L{driver.lapNumber} ({unit})
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: maxLength }).map((_, rowIndex) => (
            <tr key={rowIndex}>
              <th scope="row">
                {driverData[0]?.points[rowIndex]?.time.toFixed(1) ?? '-'}
              </th>
              {driverData.map((driver) => {
                const point = driver.points[rowIndex];
                return (
                  <td key={`${driver.driverNumber}_${driver.lapNumber}`}>
                    {point?.value !== null && point?.value !== undefined
                      ? point.value.toFixed(2)
                      : 'N/A'}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
