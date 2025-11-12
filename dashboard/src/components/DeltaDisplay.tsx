/**
 * DeltaDisplay Component
 * 
 * Displays time delta analysis between uploaded lap and reference laps.
 * Shows deltas at sector boundaries and key performance points.
 * 
 * Requirements: 5.6
 */

import { useMemo } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { LapTelemetry } from '../types/data';
import { 
  calculateLapDeltas, 
  formatDelta, 
  getDeltaColor,
  type DeltaPoint 
} from '../utils/deltaCalculator';

interface DeltaDisplayProps {
  uploadedLap: LapTelemetry;
  referenceLap: LapTelemetry;
  referenceDriverNumber: number;
}

export function DeltaDisplay({
  uploadedLap,
  referenceLap,
  referenceDriverNumber,
}: DeltaDisplayProps) {
  // Calculate delta analysis
  const analysis = useMemo(() => {
    return calculateLapDeltas(uploadedLap, referenceLap);
  }, [uploadedLap, referenceLap]);

  const getDeltaIcon = (delta: number) => {
    if (Math.abs(delta) < 0.01) {
      return <Minus size={16} className="text-gray-400" />;
    }
    return delta < 0 ? (
      <TrendingUp size={16} className="text-green-500" />
    ) : (
      <TrendingDown size={16} className="text-red-500" />
    );
  };

  const renderDeltaPoint = (point: DeltaPoint) => {
    const color = getDeltaColor(point.delta);
    
    return (
      <div
        key={`${point.type}-${point.time}`}
        className="flex items-center justify-between p-3 bg-gray-800/50 rounded border border-gray-700 hover:border-gray-600 transition-colors"
      >
        <div className="flex items-center gap-3">
          {getDeltaIcon(point.delta)}
          <div>
            <p className="text-sm font-semibold text-white font-mono">
              {point.label}
            </p>
            <p className="text-xs text-gray-400">
              {point.description}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p
            className="text-sm font-bold font-mono"
            style={{ color }}
          >
            {formatDelta(point.delta)}
          </p>
          <p className="text-xs text-gray-500">
            @ {point.time.toFixed(1)}s
          </p>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Overall Summary */}
      <div className="p-4 bg-gray-800 rounded-lg border-2 border-racing-red">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wide">
            Overall Delta vs #{referenceDriverNumber}
          </h3>
          {getDeltaIcon(analysis.overallDelta)}
        </div>
        <p
          className="text-3xl font-bold font-mono"
          style={{ color: getDeltaColor(analysis.overallDelta) }}
        >
          {formatDelta(analysis.overallDelta)}
        </p>
        <p className="text-xs text-gray-500 mt-1">
          Uploaded: {uploadedLap.metadata.duration.toFixed(3)}s | 
          Reference: {referenceLap.metadata.duration.toFixed(3)}s
        </p>
      </div>

      {/* Best/Worst Points */}
      {(analysis.maxGain || analysis.maxLoss) && (
        <div className="grid grid-cols-2 gap-3">
          {analysis.maxGain && (
            <div className="p-3 bg-green-900/20 border border-green-900/50 rounded">
              <p className="text-xs text-green-400 font-semibold mb-1 uppercase">
                Best Gain
              </p>
              <p className="text-lg font-bold font-mono text-green-500">
                {formatDelta(analysis.maxGain.delta)}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {analysis.maxGain.label}
              </p>
            </div>
          )}
          {analysis.maxLoss && (
            <div className="p-3 bg-red-900/20 border border-red-900/50 rounded">
              <p className="text-xs text-red-400 font-semibold mb-1 uppercase">
                Most Loss
              </p>
              <p className="text-lg font-bold font-mono text-red-500">
                {formatDelta(analysis.maxLoss.delta)}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {analysis.maxLoss.label}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Sector Deltas */}
      {analysis.sectorDeltas.length > 0 && (
        <div>
          <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wide mb-3">
            Sector Analysis
          </h4>
          <div className="space-y-2">
            {analysis.sectorDeltas.map(renderDeltaPoint)}
          </div>
        </div>
      )}

      {/* Key Point Deltas */}
      {analysis.keyPointDeltas.length > 0 && (
        <div>
          <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wide mb-3">
            Key Points
          </h4>
          <div className="space-y-2">
            {analysis.keyPointDeltas.map(renderDeltaPoint)}
          </div>
        </div>
      )}

      {/* Average Delta */}
      <div className="p-3 bg-gray-800/30 rounded border border-gray-700">
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-400 uppercase">Average Delta</p>
          <p
            className="text-sm font-bold font-mono"
            style={{ color: getDeltaColor(analysis.averageDelta) }}
          >
            {formatDelta(analysis.averageDelta)}
          </p>
        </div>
      </div>
    </div>
  );
}
