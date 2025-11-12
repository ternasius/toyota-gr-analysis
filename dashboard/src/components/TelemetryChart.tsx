/**
 * TelemetryChart Component
 * 
 * Interactive telemetry chart using Plotly.js for visualizing race data.
 * Supports multiple drivers, zoom/pan, synchronized axes, and progressive rendering.
 * 
 * Requirements:
 * - 3.1: Display synchronized charts for multiple data channels
 * - 3.2: Support zoom operations via drag-select
 * - 3.3: Support pan operations on zoomed charts
 * - 3.4: Double-click to reset zoom
 * - 3.5: Synchronize x-axis across all charts
 * - 3.6: Display hover tooltips with exact values and deltas
 * - 3.7: Allow toggling driver visibility via legend
 */

import React, { useEffect, useRef, useMemo, useCallback, useState } from 'react';
import Plotly from 'plotly.js-dist-min';
import type { TelemetryChannel, ZoomState } from '../types/store';
import type { LapTelemetry, SectorTiming } from '../types/data';
import { config } from '../config';
import { calculateSectorDelta, getSectorDeltaColor, formatSectorDelta } from '../utils/sectorCalculator';
import { TelemetryDataTable } from './TelemetryDataTable';

// ============================================================================
// Types
// ============================================================================

export interface TelemetryChartProps {
  /** The telemetry channel to display */
  channel: TelemetryChannel;
  
  /** Map of lap telemetry data keyed by "driverNum_lapNum" */
  data: Map<string, LapTelemetry>;
  
  /** Array of selected laps (driver + lap number pairs) */
  selectedLaps: Array<{ driverNumber: number; lapNumber: number; sourceDir: string }>;
  
  /** Optional uploaded lap for comparison */
  uploadedLap?: LapTelemetry;
  
  /** Current zoom state (null = no zoom) */
  zoomState?: ZoomState | null;
  
  /** Callback when zoom changes */
  onZoomChange?: (zoom: ZoomState | null) => void;
  
  /** Loading status for each driver */
  loadingStatus?: Map<string, { status: string; progress: number }>;
  
  /** Optional sector markers to display (Requirement 10.2) */
  sectorMarkers?: SectorTiming[];
  
  /** Show sector delta information (Requirement 10.3) */
  showSectorDeltas?: boolean;
}

// Driver color palette (matching racing aesthetic)
const DRIVER_COLORS = [
  '#C8102E', // Toyota Red
  '#00D9FF', // Cyan
  '#FFD700', // Gold
  '#00FF88', // Green
  '#FF6B35', // Orange
  '#9D4EDD', // Purple
  '#06FFA5', // Mint
  '#FF006E', // Pink
];

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get the color for a driver number
 * Note: Currently unused as we use lap index directly for colors
 */
// function getDriverColor(_driverNumber: number, index: number): string {
//   return DRIVER_COLORS[index % DRIVER_COLORS.length];
// }

/**
 * Get channel configuration (label, unit, field names)
 * Requirement 3.1: Charts for speed, throttle/brake, steering, RPM/gear
 */
function getChannelConfig(channel: TelemetryChannel): {
  title: string;
  yAxisLabel: string;
  yAxis2Label?: string;
  fields: string[];
  colors: string[];
  labels?: string[];
  yaxis2: boolean;
} {
  switch (channel) {
    case 'speed':
      return {
        title: 'SPEED',
        yAxisLabel: 'Speed (km/h)',
        fields: ['speed'],
        colors: ['#C8102E'],
        yaxis2: false,
      };
    case 'throttle':
      // Throttle only (brake is now separate)
      return {
        title: 'THROTTLE',
        yAxisLabel: 'Throttle (%)',
        fields: ['aps'], // Will fallback to 'ath' if aps has no data
        colors: ['#00FF88'],
        yaxis2: false,
      };
    case 'brake':
      return {
        title: 'BRAKE PRESSURE',
        yAxisLabel: 'Pressure (bar)',
        fields: ['pbrake_f', 'pbrake_r'],
        colors: ['#FF006E', '#FF6B35'],
        labels: ['Front', 'Rear'],
        yaxis2: false,
      };
    case 'steering':
      return {
        title: 'STEERING ANGLE',
        yAxisLabel: 'Angle (degrees)',
        fields: ['Steering_Angle'],
        colors: ['#00D9FF'],
        yaxis2: false,
      };
    case 'rpm':
      // RPM only (gear is now separate)
      return {
        title: 'RPM',
        yAxisLabel: 'RPM',
        fields: ['nmot'],
        colors: ['#FFD700'],
        yaxis2: false,
      };
    case 'gear':
      return {
        title: 'GEAR',
        yAxisLabel: 'Gear',
        fields: ['gear'],
        colors: ['#9D4EDD'],
        yaxis2: false,
      };
    default:
      return {
        title: String(channel).toUpperCase(),
        yAxisLabel: '',
        fields: [channel as string],
        colors: ['#C8102E'],
        yaxis2: false,
      };
  }
}

/**
 * Extract time series data from telemetry points
 * Filters out null values to create continuous lines
 * Supports field name fallbacks for datasets with different column names
 */
function extractTimeSeries(lap: LapTelemetry, fieldName: string, fallbackFieldName?: string) {
  let x: number[] = [];
  let y: number[] = [];
  let actualFieldUsed = fieldName;
  
  // First pass: try primary field
  lap.points.forEach((point, index) => {
    const value = (point as any)[fieldName];
    if (value !== undefined && value !== null) {
      x.push(index * 0.1); // Assume 10Hz sampling
      y.push(value);
    }
  });
  
  // If no valid data found and fallback field exists, try fallback
  if (y.length === 0 && fallbackFieldName) {
    actualFieldUsed = fallbackFieldName;
    
    // Debug: Check what fields are actually in the data
    if (lap.points.length > 0) {
      console.log(`🔍 Fallback triggered for ${fieldName} → ${fallbackFieldName}`);
      console.log(`  Sample point keys:`, Object.keys(lap.points[0]));
      console.log(`  Sample ${fallbackFieldName} values:`, lap.points.slice(0, 5).map(p => (p as any)[fallbackFieldName]));
    }
    
    lap.points.forEach((point, index) => {
      const value = (point as any)[fallbackFieldName];
      if (value !== undefined && value !== null) {
        x.push(index * 0.1);
        y.push(value);
      }
    });
  }
  
  // Debug logging for key fields
  if (['speed', 'aps', 'ath', 'nmot', 'pbrake_f', 'pbrake_r', 'steer', 'gear'].includes(fieldName) || 
      (fallbackFieldName && ['speed', 'aps', 'ath', 'nmot', 'pbrake_f', 'pbrake_r', 'steer', 'gear'].includes(fallbackFieldName))) {
    const fieldLabel = fieldName === 'aps' || fieldName === 'ath' ? 'throttle' : fieldName === 'nmot' ? 'rpm' : fieldName;
    console.log(`${fieldLabel} extraction (${actualFieldUsed}): ${y.length} valid points out of ${lap.points.length} total, sample values:`, 
      y.slice(0, 5), 
      'range:', y.length > 0 ? `${Math.min(...y)} - ${Math.max(...y)}` : 'N/A'
    );
  }
  
  return { x, y, actualFieldUsed };
}

// ============================================================================
// TelemetryChart Component
// ============================================================================

export const TelemetryChart: React.FC<TelemetryChartProps> = ({
  channel,
  data,
  selectedLaps,
  uploadedLap,
  zoomState,
  onZoomChange,
  loadingStatus,
  sectorMarkers,
  showSectorDeltas = true,
}) => {
  const plotRef = useRef<HTMLDivElement>(null);
  const plotInstanceRef = useRef<any>(null);
  const [hoveredSector, setHoveredSector] = useState<number | null>(null);
  
  // Debug logging on mount for speed and rpm
  useEffect(() => {
    if (channel === 'speed' || channel === 'rpm') {
      console.log(`🔧 ${channel.toUpperCase()} Chart mounted`);
      console.log(`  - Selected laps:`, selectedLaps.length);
      console.log(`  - Data entries:`, data.size);
      console.log(`  - Data keys:`, Array.from(data.keys()));
    }
  }, []); // Only on mount
  
  // Get channel configuration
  const channelConfig = useMemo(() => getChannelConfig(channel), [channel]);
  
  // Generate traces for all selected drivers
  const traces = useMemo(() => {
    const allTraces: any[] = [];
    const driverLaps: Map<number, LapTelemetry> = new Map();
    
    // Collect all selected laps for delta calculations
    selectedLaps.forEach(({ driverNumber, lapNumber, sourceDir }) => {
      const lapId = `${driverNumber}_${lapNumber}_${sourceDir}`;
      const lap = data.get(lapId);
      if (lap && !driverLaps.has(driverNumber)) {
        driverLaps.set(driverNumber, lap);
      }
    });
    
    // Find reference lap (fastest) for delta calculations
    let referenceLap: LapTelemetry | undefined;
    let referenceDriver: number | undefined;
    
    if (driverLaps.size > 1) {
      // Use the lap with shortest duration as reference
      let minDuration = Infinity;
      driverLaps.forEach((lap, driverNum) => {
        if (lap.metadata.duration > 0 && lap.metadata.duration < minDuration) {
          minDuration = lap.metadata.duration;
          referenceLap = lap;
          referenceDriver = driverNum;
        }
      });
    }
    
    // Add traces for each selected lap
    selectedLaps.forEach(({ driverNumber, lapNumber, sourceDir }, lapIndex) => {
      const lapId = `${driverNumber}_${lapNumber}_${sourceDir}`;
      const driverLap = data.get(lapId);
      
      if (!driverLap) {
        console.error(`❌ No lap data found for ${lapId}`);
        console.log(`Available laps in store:`, Array.from(data.keys()));
        return;
      }
      
      if (driverLap.points.length === 0) {
        console.error(`❌ Lap ${lapId} has 0 points`);
        return;
      }
      
      console.log(`✅ Processing lap ${lapId} for channel ${channel}: ${driverLap.points.length} points`);
      
      const driverColor = DRIVER_COLORS[lapIndex % DRIVER_COLORS.length];
      const isReference = driverNumber === referenceDriver;
      
      // Create traces for each field in this channel
      channelConfig.fields.forEach((fieldName, fieldIndex) => {
        // Handle field name fallbacks for different datasets
        const fallbackField = fieldName === 'aps' ? 'ath' : undefined;
        const { x, y, actualFieldUsed } = extractTimeSeries(driverLap, fieldName, fallbackField);
        
        // Debug logging for key channels
        if (['speed', 'throttle', 'rpm', 'brake', 'steering', 'gear'].includes(channel)) {
          const validY = y.filter(v => v !== null && v !== undefined);
          console.log(`🏎️ Creating ${channel} trace for driver ${driverNumber} lap ${lapNumber} (field: ${actualFieldUsed}):`);
          console.log(`  - X points: ${x.length}`);
          console.log(`  - Y points: ${y.length} (${validY.length} valid)`);
          console.log(`  - First 10 Y values:`, y.slice(0, 10));
          console.log(`  - Y range:`, validY.length > 0 ? `${Math.min(...validY as number[])} - ${Math.max(...validY as number[])}` : 'N/A');
        }
        
        const traceName = channelConfig.labels 
          ? `#${driverNumber} L${lapNumber} - ${channelConfig.labels[fieldIndex]}`
          : `#${driverNumber} L${lapNumber}`;
        
        // Build hover template with delta calculations (Requirement 3.6)
        let hoverTemplate = `<b>${traceName}</b><br>` +
          `Time: %{x:.2f}s<br>` +
          `Value: %{y:.2f}<br>`;
        
        // Add delta information if this is not the reference lap
        if (!isReference && referenceLap && selectedLaps.length > 1) {
          hoverTemplate += `<i>vs #${referenceDriver}: `;
          
          // Calculate approximate delta at this point
          // Note: This is a simplified calculation; actual implementation would
          // need to interpolate values at exact time points
          const fallbackField = fieldName === 'aps' ? 'ath' : undefined;
          const refSeries = extractTimeSeries(referenceLap, fieldName, fallbackField);
          if (refSeries.y.length > 0) {
            // Use average difference as a simple delta metric
            const validCount = y.filter(v => v !== null).length;
            const avgDelta = validCount > 0 
              ? y.reduce((sum: number, val, idx) => {
                  const refVal = refSeries.y[idx];
                  if (val !== null && refVal !== null && refVal !== undefined) {
                    return sum + (val - refVal);
                  }
                  return sum;
                }, 0) / validCount
              : 0;
            
            const deltaSign = avgDelta >= 0 ? '+' : '';
            hoverTemplate += `${deltaSign}${avgDelta.toFixed(2)}</i><br>`;
          }
        }
        
        hoverTemplate += `<extra></extra>`;
        
        const trace: any = {
          x,
          y,
          type: 'scatter',
          mode: 'lines',
          name: traceName,
          line: {
            color: channelConfig.fields.length > 1 
              ? channelConfig.colors[fieldIndex]
              : driverColor,
            width: 2.5, // Slightly thicker lines for better visibility
          },
          hovertemplate: hoverTemplate,
          customdata: y.map((val, idx) => ({
            fieldName,
            value: val,
            time: x[idx],
          })),
        };
        
        // Use secondary y-axis for gear in RPM/gear chart
        if (channelConfig.yaxis2 && fieldIndex === 1) {
          trace.yaxis = 'y2';
        }
        
        allTraces.push(trace);
        
        // Log trace addition for key channels
        if (['speed', 'throttle', 'rpm', 'brake', 'steering', 'gear'].includes(channel)) {
          console.log(`📊 Added ${channel} trace (${actualFieldUsed}):`, {
            name: trace.name,
            xLength: trace.x.length,
            yLength: trace.y.length,
            color: trace.line.color,
            width: trace.line.width
          });
        }
      });
    });
    
    // Add uploaded lap if present
    if (uploadedLap && uploadedLap.points.length > 0) {
      channelConfig.fields.forEach((fieldName, fieldIndex) => {
        // Handle field name fallbacks for different datasets
        const fallbackField = fieldName === 'aps' ? 'ath' : undefined;
        const { x, y } = extractTimeSeries(uploadedLap, fieldName, fallbackField);
        
        const traceName = channelConfig.labels
          ? `Uploaded - ${channelConfig.labels[fieldIndex]}`
          : 'Uploaded Lap';
        
        // Calculate delta vs reference if available
        let hoverTemplate = `<b>${traceName}</b><br>` +
          `Time: %{x:.2f}s<br>` +
          `Value: %{y:.2f}<br>`;
        
        if (referenceLap) {
          const fallbackField = fieldName === 'aps' ? 'ath' : undefined;
          const refSeries = extractTimeSeries(referenceLap, fieldName, fallbackField);
          if (refSeries.y.length > 0) {
            const validCount = y.filter(v => v !== null).length;
            const avgDelta = validCount > 0
              ? y.reduce((sum: number, val, idx) => {
                  const refVal = refSeries.y[idx];
                  if (val !== null && refVal !== null && refVal !== undefined) {
                    return sum + (val - refVal);
                  }
                  return sum;
                }, 0) / validCount
              : 0;
            
            const deltaSign = avgDelta >= 0 ? '+' : '';
            hoverTemplate += `<i>vs #${referenceDriver}: ${deltaSign}${avgDelta.toFixed(2)}</i><br>`;
          }
        }
        
        hoverTemplate += `<extra></extra>`;
        
        const uploadTrace: any = {
          x,
          y,
          type: 'scatter',
          mode: 'lines',
          name: traceName,
          line: {
            color: channelConfig.fields.length > 1
              ? channelConfig.colors[fieldIndex]
              : '#FFFFFF',
            width: 2,
            dash: 'dash', // Dashed line for uploaded lap (Requirement 5.5)
          },
          hovertemplate: hoverTemplate,
        };
        
        // Use secondary y-axis for gear in RPM/gear chart
        if (channelConfig.yaxis2 && fieldIndex === 1) {
          uploadTrace.yaxis = 'y2';
        }
        
        allTraces.push(uploadTrace);
      });
    }
    
    // Final trace count logging for all channels
    console.log(`📈 Total ${channel} traces created: ${allTraces.length}`);
    if (allTraces.length === 0) {
      console.error(`❌ NO ${channel.toUpperCase()} TRACES! Check above logs for issues.`);
    }
    
    return allTraces;
  }, [channel, channelConfig, data, selectedLaps, uploadedLap]);
  
  // Layout configuration
  const layout = useMemo(() => {
    // Detect mobile viewport
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
    
    const baseLayout: any = {
      title: {
        text: channelConfig.title,
        font: {
          family: 'monospace',
          size: isMobile ? 14 : 16,
          color: '#FFFFFF',
          weight: 'bold',
        },
      },
      xaxis: {
        title: isMobile ? '' : 'Time (s)', // Hide x-axis title on mobile to save space
        color: '#FFFFFF',
        gridcolor: '#333333',
        zeroline: false,
        tickfont: {
          size: isMobile ? 10 : 12,
        },
        rangemode: 'tozero', // Prevent zooming below 0
        range: undefined, // Will be set by zoom state or auto-calculated
        constrain: 'domain', // Constrain panning to data domain
      },
      yaxis: {
        title: isMobile ? '' : channelConfig.yAxisLabel, // Hide y-axis title on mobile
        color: '#FFFFFF',
        gridcolor: '#333333',
        zeroline: false,
        tickfont: {
          size: isMobile ? 10 : 12,
        },
        rangemode: 'tozero', // Prevent zooming below 0 for positive-only data
      },
      // Add secondary y-axis for combined charts (e.g., RPM/gear)
      ...(channelConfig.yaxis2 && {
        yaxis2: {
          title: isMobile ? '' : (channelConfig.yAxis2Label || ''),
          color: '#FFFFFF',
          gridcolor: '#333333',
          zeroline: false,
          overlaying: 'y',
          side: 'right',
          tickfont: {
            size: isMobile ? 10 : 12,
          },
          rangemode: 'tozero', // Prevent zooming below 0
        },
      }),
      plot_bgcolor: '#0b0b0b',
      paper_bgcolor: '#0b0b0b',
      font: {
        color: '#FFFFFF',
        size: isMobile ? 10 : 12,
      },
      margin: {
        l: isMobile ? 40 : 60,
        r: isMobile ? 30 : 30,
        t: isMobile ? 40 : 50,
        b: isMobile ? 40 : 50,
      },
      hovermode: 'x unified', // Show all traces at same x position
      showlegend: !isMobile, // Hide legend on mobile to save space
      legend: {
        x: 1.02,
        y: 1,
        xanchor: 'left',
        yanchor: 'top',
        bgcolor: 'rgba(0,0,0,0.8)',
        bordercolor: '#C8102E',
        borderwidth: 1,
        font: {
          family: 'monospace',
          size: isMobile ? 10 : 12,
          color: '#FFFFFF',
        },
        // Legend items are clickable by default in Plotly (Requirement 3.7)
        // Single click: toggle trace visibility
        // Double click: isolate trace (hide all others)
      },
    };
    
    // Apply zoom state if present (Requirement 3.5)
    // Ensure zoom doesn't go below 0
    if (zoomState) {
      baseLayout.xaxis.range = [
        Math.max(0, zoomState.startTime), 
        Math.max(0, zoomState.endTime)
      ];
    }
    
    // Add sector markers if provided (Requirement 10.2)
    if (sectorMarkers && sectorMarkers.length > 0) {
      baseLayout.shapes = [];
      baseLayout.annotations = [];
      
      // Find reference lap (fastest) for delta calculations
      let referenceLap: LapTelemetry | undefined;
      
      if (showSectorDeltas && selectedLaps.length > 0) {
        let minDuration = Infinity;
        selectedLaps.forEach(({ driverNumber, lapNumber, sourceDir }) => {
          const lapId = `${driverNumber}_${lapNumber}_${sourceDir}`;
          const lap = data.get(lapId);
          if (lap && lap.metadata.duration > 0 && lap.metadata.duration < minDuration) {
              minDuration = lap.metadata.duration;
              referenceLap = lap;
            }
        });
      }
      
      // Add vertical lines at sector boundaries and sector regions
      sectorMarkers.forEach((sector, index) => {
        // Add sector highlight region on hover (Requirement 10.4)
        if (hoveredSector === sector.sectorNumber) {
          baseLayout.shapes.push({
            type: 'rect',
            x0: sector.startTime,
            x1: sector.endTime,
            y0: 0,
            y1: 1,
            yref: 'paper',
            fillcolor: 'rgba(200, 16, 46, 0.1)', // Toyota red with transparency
            line: {
              width: 0,
            },
            layer: 'below',
          });
        }
        
        // Don't draw line at start (time = 0)
        if (sector.startTime > 0) {
          baseLayout.shapes.push({
            type: 'line',
            x0: sector.startTime,
            x1: sector.startTime,
            y0: 0,
            y1: 1,
            yref: 'paper',
            line: {
              color: '#888888',
              width: 1,
              dash: 'dot',
            },
          });
        }
        
        // Add sector label annotation
        const sectorMidpoint = (sector.startTime + sector.endTime) / 2;
        let sectorText = `S${sector.sectorNumber}`;
        
        // Add delta information if available (Requirement 10.3)
        if (showSectorDeltas && referenceLap && referenceLap.sectors.length > index) {
          const referenceSector = referenceLap.sectors[index];
          const delta = calculateSectorDelta(sector, referenceSector);
          
          // Only show delta if this is not the reference lap
          if (Math.abs(delta) > 0.001) {
            sectorText += ` (${formatSectorDelta(delta)})`;
          }
        }
        
        baseLayout.annotations.push({
          x: sectorMidpoint,
          y: 1,
          yref: 'paper',
          text: sectorText,
          showarrow: false,
          font: {
            family: 'monospace',
            size: 10,
            color: hoveredSector === sector.sectorNumber ? '#C8102E' : '#888888',
          },
          yanchor: 'bottom',
          yshift: 5,
        });
      });
      
      // Add final boundary line at end of last sector
      const lastSector = sectorMarkers[sectorMarkers.length - 1];
      if (lastSector) {
        baseLayout.shapes.push({
          type: 'line',
          x0: lastSector.endTime,
          x1: lastSector.endTime,
          y0: 0,
          y1: 1,
          yref: 'paper',
          line: {
            color: '#888888',
            width: 1,
            dash: 'dot',
          },
        });
      }
    }
    
    return baseLayout;
  }, [channelConfig, zoomState, sectorMarkers, hoveredSector, showSectorDeltas, selectedLaps, data]);
  
  // Plotly configuration
  const plotConfig = useMemo(() => {
    // Detect mobile/touch device
    const isTouchDevice = typeof window !== 'undefined' && (
      'ontouchstart' in window ||
      navigator.maxTouchPoints > 0
    );

    return {
      responsive: true,
      displayModeBar: !isTouchDevice, // Hide mode bar on touch devices to save space
      modeBarButtonsToRemove: ['lasso2d', 'select2d'] as any,
      displaylogo: false,
      scrollZoom: true, // Enable scroll wheel zoom
      doubleClick: 'reset' as const, // Double-click resets zoom (Requirement 3.4)
      // Enable touch interactions (Requirement 6.6)
      // Plotly automatically supports pinch-to-zoom on touch devices
      toImageButtonOptions: {
        format: 'png' as const,
        filename: `telemetry_${channel}`,
        height: 800,
        width: 1200,
      },
    };
  }, [channel]);
  
  // Debounce timer ref for zoom/pan events
  const debounceTimerRef = useRef<number | null>(null);
  
  // Handle zoom/pan events (Requirements 3.2, 3.3, 3.5)
  const handleRelayout = useCallback((event: any) => {
    if (!onZoomChange) return;
    
    // Clear existing debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    
    // Check if this is a zoom/pan event
    if (event['xaxis.range[0]'] !== undefined && event['xaxis.range[1]'] !== undefined) {
      // Constrain zoom to not go below 0
      const newZoom: ZoomState = {
        startTime: Math.max(0, event['xaxis.range[0]']),
        endTime: Math.max(0, event['xaxis.range[1]']),
      };
      
      // Debounce zoom changes (Requirement 3.2: 100ms debounce)
      // This ensures smooth performance and synchronized updates across all charts
      debounceTimerRef.current = setTimeout(() => {
        onZoomChange(newZoom);
      }, config.zoomDebounceMs);
    }
    
    // Check for zoom reset (autosize event)
    if (event['xaxis.autorange'] === true) {
      onZoomChange(null);
    }
  }, [onZoomChange]);
  
  // Handle double-click to reset zoom (Requirement 3.4)
  const handleDoubleClick = useCallback(() => {
    if (onZoomChange) {
      onZoomChange(null);
    }
  }, [onZoomChange]);
  
  // Handle hover to detect sector regions (Requirement 10.3, 10.4)
  const handleHover = useCallback((event: any) => {
    if (!sectorMarkers || sectorMarkers.length === 0) return;
    
    // Get the x-coordinate (time) from hover event
    const points = event.points;
    if (!points || points.length === 0) return;
    
    const xValue = points[0].x;
    
    // Find which sector this time falls into
    const sector = sectorMarkers.find(
      s => xValue >= s.startTime && xValue <= s.endTime
    );
    
    if (sector) {
      setHoveredSector(sector.sectorNumber);
    } else {
      setHoveredSector(null);
    }
  }, [sectorMarkers]);
  
  // Handle unhover to clear sector highlight
  const handleUnhover = useCallback(() => {
    setHoveredSector(null);
  }, []);
  
  // Initialize or update the plot
  // Progressive rendering (Requirement 9.1, 9.2): Charts update incrementally
  // as data chunks arrive from the Web Worker. The traces are regenerated
  // whenever telemetry data changes, allowing smooth progressive updates.
  useEffect(() => {
    if (!plotRef.current) return;
    
    const plotDiv = plotRef.current;
    
    // Debug logging for all key charts
    if (['speed', 'throttle', 'rpm', 'brake', 'steering', 'gear'].includes(channel)) {
      console.log(`🎨 Rendering ${channel} chart with ${traces.length} traces`);
      if (traces.length > 0) {
        console.log(`  First trace:`, {
          name: traces[0].name,
          xLength: traces[0].x?.length || 0,
          yLength: traces[0].y?.length || 0,
          type: traces[0].type,
          mode: traces[0].mode
        });
      } else {
        console.error(`❌ NO TRACES TO RENDER for ${channel}!`);
      }
    }
    
    // Create or update the plot
    if (!plotInstanceRef.current) {
      // Initial creation
      Plotly.newPlot(plotDiv, traces, layout, plotConfig).then((plot) => {
        plotInstanceRef.current = plot;
        
        // Attach event listeners
        (plotDiv as any).on('plotly_relayout', handleRelayout);
        (plotDiv as any).on('plotly_doubleclick', handleDoubleClick);
        (plotDiv as any).on('plotly_hover', handleHover);
        (plotDiv as any).on('plotly_unhover', handleUnhover);
      });
    } else {
      // Update existing plot (Requirement 9.2: Progressive rendering)
      // Using Plotly.react for efficient updates as new data arrives
      Plotly.react(plotDiv, traces, layout, plotConfig);
    }
    
    // Cleanup
    return () => {
      if (plotInstanceRef.current) {
        (plotDiv as any).removeAllListeners('plotly_relayout');
        (plotDiv as any).removeAllListeners('plotly_doubleclick');
        (plotDiv as any).removeAllListeners('plotly_hover');
        (plotDiv as any).removeAllListeners('plotly_unhover');
      }
      
      // Clear debounce timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [traces, layout, plotConfig, handleRelayout, handleDoubleClick, handleHover, handleUnhover]);
  
  // Calculate loading progress (Requirement 9.1, 9.2, 9.3, 9.4)
  const loadingProgress = useMemo(() => {
    if (!loadingStatus) return null;
    
    const relevantStatuses = selectedLaps
      .map(({ driverNumber, lapNumber, sourceDir }) => {
        const lapId = `${driverNumber}_${lapNumber}_${sourceDir}`;
        // Find status for this specific lap
        return loadingStatus.get(lapId);
      })
      .filter(s => s !== undefined);
    
    if (relevantStatuses.length === 0) return null;
    
    // Check if any are loading
    const isLoading = relevantStatuses.some(
      s => s!.status === 'fetching' || s!.status === 'parsing'
    );
    
    if (!isLoading) return null;
    
    // Calculate average progress
    const avgProgress = relevantStatuses.reduce(
      (sum, s) => sum + (s!.progress || 0),
      0
    ) / relevantStatuses.length;
    
    return {
      isLoading: true,
      progress: Math.round(avgProgress),
    };
  }, [selectedLaps, loadingStatus]);
  
  // Calculate sector delta information for tooltip (Requirement 10.3)
  const sectorDeltaInfo = useMemo(() => {
    if (!hoveredSector || !sectorMarkers || !showSectorDeltas) return null;
    
    // Find reference lap (fastest)
    let referenceLap: LapTelemetry | undefined;
    let referenceDriver: number | undefined;
    let minDuration = Infinity;
    
    selectedLaps.forEach(({ driverNumber, lapNumber, sourceDir }) => {
      const lapId = `${driverNumber}_${lapNumber}_${sourceDir}`;
      const lap = data.get(lapId);
      if (lap && lap.metadata.duration > 0 && lap.metadata.duration < minDuration) {
        minDuration = lap.metadata.duration;
        referenceLap = lap;
        referenceDriver = driverNumber;
      }
    });
    
    if (!referenceLap || referenceLap.sectors.length === 0) return null;
    
    const sectorIndex = hoveredSector - 1;
    if (sectorIndex < 0 || sectorIndex >= sectorMarkers.length) return null;
    
    const currentSector = sectorMarkers[sectorIndex];
    const referenceSector = referenceLap.sectors[sectorIndex];
    
    if (!referenceSector) return null;
    
    const delta = calculateSectorDelta(currentSector, referenceSector);
    const deltaColor = getSectorDeltaColor(delta);
    
    return {
      sectorNumber: hoveredSector,
      delta,
      deltaColor,
      deltaText: formatSectorDelta(delta),
      referenceDriver,
      currentTime: currentSector.duration,
      referenceTime: referenceSector.duration,
    };
  }, [hoveredSector, sectorMarkers, showSectorDeltas, selectedLaps, data]);
  
  return (
    <div className="relative w-full h-full min-h-[300px] md:min-h-[400px]">
      {/* Accessible data table for screen readers (Requirement 16.3) */}
      <TelemetryDataTable
        data={data}
        selectedLaps={selectedLaps}
        channel={channel}
        sampleRate={20}
      />
      
      {/* Loading indicator with progress (Requirements 1.6, 9.3) */}
      {loadingProgress && loadingProgress.isLoading && (
        <div className="absolute top-2 right-2 md:top-4 md:right-4 z-10 bg-black/90 px-3 py-2 md:px-4 md:py-2 rounded-md border border-[#C8102E]">
          <div className="flex items-center gap-2 md:gap-3">
            <div className="w-3 h-3 md:w-4 md:h-4 border-2 border-[#C8102E] border-t-transparent rounded-full animate-spin" />
            <div className="flex flex-col">
              <span className="text-white text-xs md:text-sm font-mono">Loading...</span>
              <div className="flex items-center gap-2 mt-1">
                <div className="w-16 md:w-24 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#C8102E] transition-all duration-300"
                    style={{ width: `${loadingProgress.progress}%` }}
                  />
                </div>
                <span className="text-gray-400 text-xs font-mono">
                  {loadingProgress.progress}%
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Sector delta tooltip (Requirements 10.3, 10.5) */}
      {sectorDeltaInfo && (
        <div className="absolute top-2 left-2 md:top-4 md:left-4 z-10 bg-black/90 px-3 py-2 md:px-4 md:py-3 rounded-md border-2 transition-all duration-200"
             style={{ borderColor: sectorDeltaInfo.deltaColor }}>
          <div className="flex flex-col gap-1">
            <div className="text-white text-xs md:text-sm font-mono font-bold">
              Sector {sectorDeltaInfo.sectorNumber}
            </div>
            <div className="text-gray-400 text-xs font-mono">
              Time: {sectorDeltaInfo.currentTime.toFixed(3)}s
            </div>
            {sectorDeltaInfo.referenceDriver && Math.abs(sectorDeltaInfo.delta) > 0.001 && (
              <>
                <div className="border-t border-gray-700 my-1" />
                <div className="text-xs font-mono" style={{ color: sectorDeltaInfo.deltaColor }}>
                  vs #{sectorDeltaInfo.referenceDriver}: {sectorDeltaInfo.deltaText}
                </div>
                <div className="text-gray-500 text-xs font-mono">
                  Ref: {sectorDeltaInfo.referenceTime.toFixed(3)}s
                </div>
              </>
            )}
          </div>
        </div>
      )}
      
      {/* Chart container */}
      <div ref={plotRef} className="w-full h-full" />
      
      {/* Empty state */}
      {traces.length === 0 && !loadingProgress && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center text-gray-400 px-4">
            <p className="text-base md:text-lg font-mono">No {channelConfig.title.toLowerCase()} data available</p>
            <p className="text-xs md:text-sm mt-2">
              {selectedLaps.length === 0 
                ? 'Select laps to view telemetry' 
                : 'This lap has no recorded data for this channel'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default TelemetryChart;
