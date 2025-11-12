/**
 * Navbar Component
 * 
 * Top navigation bar with logo, track selector, upload button, and theme toggle.
 * Styled with racing aesthetic (dark theme, Toyota red accents).
 * 
 * Requirements: 2.1, 6.1, 6.2
 */

import { useState } from 'react';
import { Upload } from 'lucide-react';
import { useDashboardStore } from '../store/useDashboardStore';
import { UploadModal } from './UploadModal';
import { ExportButton } from './ExportButton';

export function Navbar() {
  const { 
    selectedTrack, 
    trackManifest, 
    setTrack,
  } = useDashboardStore();
  
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  const handleTrackChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const trackId = event.target.value;
    if (trackId) {
      setTrack(trackId).catch(error => {
        console.error('Failed to load track:', error);
        // TODO: Show error toast in task 13
      });
    }
  };

  const handleUploadClick = () => {
    setIsUploadModalOpen(true);
  };

  return (
    <nav className="w-full carbon-fiber border-b border-gray-800" role="navigation" aria-label="Main navigation">
      <div className="px-4 py-3 flex items-center justify-between gap-4">
        {/* Logo */}
        <div className="flex items-center gap-3 flex-shrink-0 fade-in" role="banner">
          <div className="w-10 h-10 racing-gradient flex items-center justify-center font-bold text-lg rounded shadow-lg glow-racing" aria-hidden="true">
            RT
          </div>
          <div className="hidden sm:block">
            <div className="text-lg font-bold leading-tight telemetry-label">
              <span className="text-racing-red">RACE TELEMETRY</span>
            </div>
            <div className="text-xs text-gray-400 uppercase tracking-wide">
              Toyota GR Cup
            </div>
          </div>
        </div>

        {/* Track Selector */}
        <div className="flex-1 max-w-xs">
          <label htmlFor="track-selector" className="sr-only">
            Select racing track
          </label>
          <select
            id="track-selector"
            value={selectedTrack || ''}
            onChange={handleTrackChange}
            className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-sm focus:outline-none focus:border-racing-red focus:ring-2 focus:ring-racing-red/50 transition-colors"
            disabled={!trackManifest}
            aria-label="Select racing track"
          >
            <option value="">
              {trackManifest ? 'SELECT TRACK' : 'LOADING...'}
            </option>
            {trackManifest?.tracks.map((track) => (
              <option key={track.id} value={track.id}>
                {track.name.toUpperCase()}
              </option>
            ))}
          </select>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 fade-in" role="toolbar" aria-label="Dashboard actions">
          {/* Export Button */}
          <ExportButton variant="compact" />

          {/* Upload Button - Touch optimized (min 44x44px) */}
          <button
            onClick={handleUploadClick}
            className="min-w-[44px] min-h-[44px] px-3 py-2 bg-gray-900 border border-gray-700 rounded hover:border-racing-red hover-racing focus:outline-none focus:ring-2 focus:ring-racing-red/50 flex items-center justify-center gap-2 text-sm telemetry-label"
            title="Upload Lap Data"
            aria-label="Upload lap data"
          >
            <Upload size={16} aria-hidden="true" />
            <span className="hidden md:inline">UPLOAD</span>
          </button>
        </div>
      </div>
      
      {/* Upload Modal */}
      <UploadModal 
        isOpen={isUploadModalOpen} 
        onClose={() => setIsUploadModalOpen(false)} 
      />
    </nav>
  );
}
