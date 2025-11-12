/**
 * ExportButton Component
 * 
 * Button for exporting currently displayed telemetry data to CSV.
 * 
 * Requirements:
 * - 8.1: Provide export button that generates CSV file
 * - 8.2: Include data for all currently selected drivers
 * - 8.4: Trigger browser download within 1 second
 */

import { useState } from 'react';
import { Download } from 'lucide-react';
import { useDashboardStore } from '../store/useDashboardStore';

interface ExportButtonProps {
  variant?: 'default' | 'compact';
  className?: string;
}

export function ExportButton({ variant = 'default', className = '' }: ExportButtonProps) {
  const { selectedLaps, uploadedLap, exportData } = useDashboardStore();
  const [isExporting, setIsExporting] = useState(false);

  // Check if there's any data to export
  const hasData = selectedLaps.length > 0 || uploadedLap !== null;

  /**
   * Handle export button click
   */
  const handleExport = async () => {
    if (!hasData) {
      alert('Please select at least one driver or upload a lap to export data.');
      return;
    }

    try {
      setIsExporting(true);
      exportData();
    } catch (error) {
      console.error('Failed to export telemetry data:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      alert(`Failed to export telemetry data: ${errorMessage}`);
    } finally {
      setIsExporting(false);
    }
  };

  if (variant === 'compact') {
    return (
      <button
        onClick={handleExport}
        disabled={!hasData || isExporting}
        className={`
          min-w-[44px] min-h-[44px] p-2 rounded flex items-center justify-center
          ${hasData 
            ? 'bg-racing-red/10 hover:bg-racing-red/20 border border-racing-red/30 hover:border-racing-red/50 text-racing-red' 
            : 'bg-gray-800 border border-gray-700 text-gray-500 cursor-not-allowed'
          }
          transition-all disabled:opacity-50
          ${className}
        `}
        title={hasData ? 'Export telemetry data to CSV' : 'Select drivers to export data'}
        aria-label={hasData ? 'Export telemetry data' : 'No data to export'}
      >
        <Download size={18} />
      </button>
    );
  }

  return (
    <button
      onClick={handleExport}
      disabled={!hasData || isExporting}
      className={`
        flex items-center gap-2 px-4 py-2 rounded font-medium text-sm min-h-[44px]
        ${hasData 
          ? 'bg-racing-red/10 hover:bg-racing-red/20 border border-racing-red/30 hover:border-racing-red/50 text-racing-red' 
          : 'bg-gray-800 border border-gray-700 text-gray-500 cursor-not-allowed'
        }
        transition-all disabled:opacity-50
        ${className}
      `}
      title={hasData ? 'Export telemetry data to CSV' : 'Select drivers to export data'}
      aria-label={hasData ? 'Export telemetry data' : 'No data to export'}
    >
      <Download size={16} />
      <span>{isExporting ? 'Exporting...' : 'Export Data'}</span>
    </button>
  );
}
