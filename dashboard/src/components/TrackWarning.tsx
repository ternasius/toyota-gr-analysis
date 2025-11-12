/**
 * TrackWarning Component
 * 
 * Displays warnings for tracks with known data issues.
 * Currently handles Sebring track warning.
 * 
 * Requirement 7.5: Display warning for Sebring track (different format)
 */

import { AlertTriangle } from 'lucide-react';
import { isSebringStrack, getSebringSWarning } from '../utils/dataQuirks';

interface TrackWarningProps {
  trackId: string;
}

export function TrackWarning({ trackId }: TrackWarningProps) {
  // Check if this track has known issues
  const isSebring = isSebringStrack(trackId);
  
  if (!isSebring) {
    return null;
  }
  
  return (
    <div className="bg-yellow-900/20 border border-yellow-600/50 rounded-lg p-3 mb-4">
      <div className="flex items-start gap-2">
        <AlertTriangle className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
        <div>
          <h4 className="text-xs font-semibold text-yellow-400 mb-1">
            Track Data Warning
          </h4>
          <p className="text-xs text-gray-300">
            {getSebringSWarning()}
          </p>
        </div>
      </div>
    </div>
  );
}
