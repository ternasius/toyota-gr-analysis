/**
 * Driver Stats Table Skeleton
 * 
 * Loading skeleton for the driver statistics table.
 * Shows animated placeholder rows while data is loading.
 * 
 * Requirements: 14.3, 1.6
 */

import React from 'react';

interface DriverStatsTableSkeletonProps {
  /** Number of skeleton rows to display (default: 10) */
  rows?: number;
}

/**
 * Skeleton component for driver statistics table
 */
export const DriverStatsTableSkeleton: React.FC<DriverStatsTableSkeletonProps> = ({ 
  rows = 10 
}) => {
  return (
    <div className="bg-black/50 border border-gray-800 rounded-lg overflow-hidden">
      {/* Table header skeleton */}
      <div className="bg-gray-900 border-b border-gray-800 p-4">
        <div className="grid grid-cols-9 gap-2">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="h-4 bg-gray-700 rounded animate-pulse" />
          ))}
        </div>
      </div>
      
      {/* Table rows skeleton */}
      <div className="divide-y divide-gray-800">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={rowIndex} className="p-4 hover:bg-gray-900/50 transition-colors">
            <div className="grid grid-cols-9 gap-2">
              {/* Driver number */}
              <div className="h-6 bg-gray-700 rounded animate-pulse" style={{ animationDelay: `${rowIndex * 50}ms` }} />
              
              {/* Stats columns */}
              {Array.from({ length: 8 }).map((_, colIndex) => (
                <div 
                  key={colIndex} 
                  className="h-6 bg-gray-700 rounded animate-pulse"
                  style={{ animationDelay: `${rowIndex * 50 + colIndex * 20}ms` }}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * Compact skeleton for mobile/tablet views
 */
export const DriverStatsTableSkeletonCompact: React.FC<DriverStatsTableSkeletonProps> = ({ 
  rows = 10 
}) => {
  return (
    <div className="bg-black/50 border border-gray-800 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gray-900 border-b border-gray-800 p-3">
        <div className="h-4 bg-gray-700 rounded w-32 animate-pulse" />
      </div>
      
      {/* Compact rows */}
      <div className="divide-y divide-gray-800">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={rowIndex} className="p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="h-5 bg-gray-700 rounded w-16 animate-pulse" style={{ animationDelay: `${rowIndex * 50}ms` }} />
              <div className="h-5 bg-gray-700 rounded w-24 animate-pulse" style={{ animationDelay: `${rowIndex * 50 + 20}ms` }} />
            </div>
            <div className="flex gap-2">
              <div className="h-4 bg-gray-700 rounded flex-1 animate-pulse" style={{ animationDelay: `${rowIndex * 50 + 40}ms` }} />
              <div className="h-4 bg-gray-700 rounded flex-1 animate-pulse" style={{ animationDelay: `${rowIndex * 50 + 60}ms` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DriverStatsTableSkeleton;
