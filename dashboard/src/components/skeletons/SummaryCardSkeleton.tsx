/**
 * Summary Card Skeleton
 * 
 * Loading skeleton for summary cards (fastest lap, average top 10, track conditions).
 * Displays animated placeholder while data is loading.
 * 
 * Requirements: 14.3, 1.6
 */

import React from 'react';

/**
 * Skeleton component for a single summary card
 */
export const SummaryCardSkeleton: React.FC = () => {
  return (
    <div className="bg-black/50 border border-gray-800 rounded-lg p-6 animate-pulse">
      {/* Card title skeleton */}
      <div className="h-4 bg-gray-700 rounded w-32 mb-4" />
      
      {/* Main value skeleton */}
      <div className="h-10 bg-gray-700 rounded w-40 mb-2" />
      
      {/* Subtitle skeleton */}
      <div className="h-3 bg-gray-700 rounded w-24" />
    </div>
  );
};

/**
 * Skeleton component for all three summary cards
 */
export const SummaryCardsSkeleton: React.FC = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <SummaryCardSkeleton />
      <SummaryCardSkeleton />
      <SummaryCardSkeleton />
    </div>
  );
};

export default SummaryCardsSkeleton;
