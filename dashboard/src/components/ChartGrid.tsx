/**
 * ChartGrid Component
 * 
 * Responsive grid layout for telemetry charts.
 * - Mobile: Single column (stacked)
 * - Tablet: Single column (full width stacked)
 * - Desktop: 2x2 grid
 * 
 * Requirements: 6.5, 6.6
 */

import type { ReactNode } from 'react';

interface ChartGridProps {
  children: ReactNode;
}

export function ChartGrid({ children }: ChartGridProps) {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 md:gap-6">
      {children}
    </div>
  );
}

interface ChartCardProps {
  children: ReactNode;
  title?: string;
}

export function ChartCard({ children, title }: ChartCardProps) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
      {title && (
        <div className="px-4 py-2 border-b border-gray-800 bg-gray-900/50">
          <h3 className="text-xs uppercase tracking-wide text-gray-400 font-bold">
            {title}
          </h3>
        </div>
      )}
      <div className="p-2 md:p-4">
        {children}
      </div>
    </div>
  );
}
