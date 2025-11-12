/**
 * UploadModal Component
 * 
 * Modal dialog for uploading and validating CSV telemetry files.
 * Integrates FileUploadZone with validation and store actions.
 * 
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5
 */

import { useState, useRef } from 'react';
import { X } from 'lucide-react';
import { FileUploadZone } from './FileUploadZone';
import { useDashboardStore } from '../store/useDashboardStore';
import { useEscapeKey, useFocusTrap } from '../hooks/useKeyboardShortcuts';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function UploadModal({ isOpen, onClose }: UploadModalProps) {
  const { uploadLap } = useDashboardStore();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  // Handle Escape key to close modal (Requirement 16.2)
  useEscapeKey(() => {
    if (!isUploading) {
      handleClose();
    }
  }, isOpen);

  // Trap focus within modal (Requirement 16.2)
  useFocusTrap(modalRef, isOpen);

  if (!isOpen) return null;

  const handleFileSelect = async (file: File) => {
    setIsUploading(true);
    setUploadProgress(0);
    setError(null);
    setUploadSuccess(false);

    try {
      // Simulate progress updates (in real implementation, this would come from worker)
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 100);

      // Upload and parse the file (Requirement 5.4: Complete within 2 seconds)
      await uploadLap(file);

      // Complete progress
      clearInterval(progressInterval);
      setUploadProgress(100);
      setUploadSuccess(true);

      // Auto-close after success
      setTimeout(() => {
        onClose();
        // Reset state after modal closes
        setTimeout(() => {
          setIsUploading(false);
          setUploadProgress(0);
          setUploadSuccess(false);
        }, 300);
      }, 1500);
    } catch (err) {
      // Handle validation errors (Requirement 5.3: Display specific error messages)
      const errorMessage = err instanceof Error ? err.message : 'Failed to upload file';
      setError(errorMessage);
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleCancel = () => {
    if (!isUploading) {
      setError(null);
      setUploadProgress(0);
      setUploadSuccess(false);
    }
  };

  const handleClose = () => {
    if (!isUploading) {
      onClose();
      // Reset state after modal closes
      setTimeout(() => {
        setError(null);
        setUploadProgress(0);
        setUploadSuccess(false);
      }, 300);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 z-[9998] transition-opacity"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 overflow-y-auto">
        <div
          ref={modalRef}
          className="bg-gray-900 border border-gray-700 rounded-lg shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto my-auto"
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-labelledby="upload-modal-title"
          aria-describedby="upload-modal-description"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-700">
            <div>
              <h2 id="upload-modal-title" className="text-xl font-bold text-white font-mono">
                UPLOAD LAP DATA
              </h2>
              <p id="upload-modal-description" className="text-sm text-gray-400 mt-1">
                Compare your lap telemetry against top 10 drivers
              </p>
            </div>
            <button
              onClick={handleClose}
              disabled={isUploading}
              className="p-2 hover:bg-gray-800 rounded focus:outline-none focus:ring-2 focus:ring-racing-red/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-w-[44px] min-h-[44px]"
              aria-label="Close upload dialog"
              title="Close (Esc)"
            >
              <X size={24} className="text-gray-400" aria-hidden="true" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            {!uploadSuccess ? (
              <FileUploadZone
                onFileSelect={handleFileSelect}
                onCancel={handleCancel}
                isUploading={isUploading}
                uploadProgress={uploadProgress}
                error={error}
              />
            ) : (
              <div className="text-center py-12">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-green-900/20 border-2 border-green-500 rounded-full mb-4">
                  <svg
                    className="w-8 h-8 text-green-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-white mb-2">
                  Upload Successful!
                </h3>
                <p className="text-gray-400">
                  Your lap data has been added to the comparison
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          {!uploadSuccess && (
            <div className="flex items-center justify-between p-6 border-t border-gray-700 bg-gray-800/50">
              <div className="text-xs text-gray-500">
                <p className="font-semibold text-gray-400 mb-1">
                  Supported file format:
                </p>
                <p>CSV files with telemetry data (max 50MB)</p>
              </div>
              <button
                onClick={handleClose}
                disabled={isUploading}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded focus:outline-none focus:ring-2 focus:ring-racing-red/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
                aria-label="Cancel and close dialog"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
