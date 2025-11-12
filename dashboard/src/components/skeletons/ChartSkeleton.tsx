/**
 * Chart Skeleton
 * 
 * Loading skeleton for telemetry charts.
 * Shows animated placeholder while chart data is loading.
 * 
 * Requirements: 14.3, 1.6, 9.3
 */

import React from 'react';

interface ChartSkeletonProps {
  /** Chart title (e.g., "SPEED", "THROTTLE / BRAKE") */
  title?: string;
  /** Height of the skeleton (default: 400px) */
  height?: number;
}

/**
 * Skeleton component for telemetry charts
 */
export const ChartSkeleton: React.FC<ChartSkeletonProps> = ({ 
  title = 'LOADING',
  height = 400,
}) => {
  return (
    <div 
      className="bg-black/50 border border-gray-800 rounded-lg p-4 relative overflow-hidden"
      style={{ minHeight: `${height}px` }}
    >
      {/* Chart title */}
      <div className="flex items-center justify-between mb-4">
        <div className="h-5 bg-gray-700 rounded w-32 animate-pulse">
          <span className="sr-only">{title}</span>
        </div>
        <div className="h-5 bg-gray-700 rounded w-24 animate-pulse" />
      </div>
      
      {/* Chart area with animated wave pattern */}
      <div className="relative" style={{ height: `${height - 80}px` }}>
        {/* Y-axis labels */}
        <div className="absolute left-0 top-0 bottom-0 w-12 flex flex-col justify-between py-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div 
              key={i} 
              className="h-3 bg-gray-700 rounded animate-pulse"
              style={{ animationDelay: `${i * 100}ms` }}
            />
          ))}
        </div>
        
        {/* Chart grid lines */}
        <div className="absolute left-12 right-12 top-0 bottom-0 flex flex-col justify-between">
          {Array.from({ length: 5 }).map((_, i) => (
            <div 
              key={i} 
              className="h-px bg-gray-800"
            />
          ))}
        </div>
        
        {/* Animated wave pattern simulating chart data */}
        <div className="absolute left-12 right-12 top-0 bottom-0 flex items-center">
          <svg 
            className="w-full h-full opacity-30" 
            viewBox="0 0 100 50" 
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id="chartGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#C8102E" stopOpacity="0.1">
                  <animate 
                    attributeName="stop-opacity" 
                    values="0.1;0.3;0.1" 
                    dur="2s" 
                    repeatCount="indefinite" 
                  />
                </stop>
                <stop offset="50%" stopColor="#C8102E" stopOpacity="0.3">
                  <animate 
                    attributeName="stop-opacity" 
                    values="0.3;0.5;0.3" 
                    dur="2s" 
                    repeatCount="indefinite" 
                  />
                </stop>
                <stop offset="100%" stopColor="#C8102E" stopOpacity="0.1">
                  <animate 
                    attributeName="stop-opacity" 
                    values="0.1;0.3;0.1" 
                    dur="2s" 
                    repeatCount="indefinite" 
                  />
                </stop>
              </linearGradient>
            </defs>
            
            {/* Animated wave path */}
            <path
              d="M 0 25 Q 25 15, 50 25 T 100 25"
              stroke="url(#chartGradient)"
              strokeWidth="2"
              fill="none"
              className="animate-pulse"
            />
            <path
              d="M 0 30 Q 25 20, 50 30 T 100 30"
              stroke="url(#chartGradient)"
              strokeWidth="2"
              fill="none"
              className="animate-pulse"
              style={{ animationDelay: '0.5s' }}
            />
          </svg>
        </div>
        
        {/* X-axis labels */}
        <div className="absolute left-12 right-12 bottom-0 flex justify-between">
          {Array.from({ length: 6 }).map((_, i) => (
            <div 
              key={i} 
              className="h-3 bg-gray-700 rounded w-8 animate-pulse"
              style={{ animationDelay: `${i * 100}ms` }}
            />
          ))}
        </div>
      </div>
      
      {/* Legend skeleton */}
      <div className="flex gap-4 mt-4 flex-wrap">
        {Array.from({ length: 3 }).map((_, i) => (
          <div 
            key={i} 
            className="flex items-center gap-2 animate-pulse"
            style={{ animationDelay: `${i * 150}ms` }}
          >
            <div className="w-4 h-4 bg-gray-700 rounded" />
            <div className="h-3 bg-gray-700 rounded w-16" />
          </div>
        ))}
      </div>
      
      {/* Loading indicator overlay */}
      <div className="absolute top-4 right-4 flex items-center gap-2 bg-black/90 px-3 py-2 rounded-md border border-gray-700">
        <div className="w-3 h-3 border-2 border-[#C8102E] border-t-transparent rounded-full animate-spin" />
        <span className="text-gray-400 text-xs font-mono">Loading...</span>
      </div>
    </div>
  );
};

/**
 * Skeleton for multiple charts in a grid layout
 */
export const ChartsGridSkeleton: React.FC<{ count?: number }> = ({ count = 4 }) => {
  const titles = ['SPEED', 'THROTTLE / BRAKE', 'STEERING ANGLE', 'RPM / GEAR'];
  
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <ChartSkeleton 
          key={i} 
          title={titles[i] || 'LOADING'}
          height={400}
        />
      ))}
    </div>
  );
};

export default ChartSkeleton;
