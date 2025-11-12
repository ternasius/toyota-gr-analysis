/**
 * FileUploadZone Component
 * 
 * Drag-and-drop upload zone for CSV telemetry files.
 * Accepts CSV files up to 50MB with visual feedback and progress indication.
 * 
 * Requirements: 5.1
 */

import { useState, useRef } from 'react';
import type { DragEvent, ChangeEvent } from 'react';
import { Upload, FileText, X, AlertCircle } from 'lucide-react';
import { config } from '../config';

interface FileUploadZoneProps {
  onFileSelect: (file: File) => void;
  onCancel?: () => void;
  isUploading?: boolean;
  uploadProgress?: number;
  error?: string | null;
}

export function FileUploadZone({
  onFileSelect,
  onCancel,
  isUploading = false,
  uploadProgress = 0,
  error = null,
}: FileUploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragEnter = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleFile = (file: File) => {
    // Validate file type
    if (!file.name.endsWith('.csv')) {
      return;
    }

    // Validate file size (50MB max)
    if (file.size > config.maxUploadSizeBytes) {
      return;
    }

    setSelectedFile(file);
    onFileSelect(file);
  };

  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  const handleClear = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onCancel?.();
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  };

  return (
    <div className="w-full">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        onChange={handleFileInputChange}
        className="hidden"
      />

      {/* Upload zone */}
      <div
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={`
          relative border-2 border-dashed rounded-lg p-8 transition-all
          ${isDragging 
            ? 'border-racing-red bg-racing-red/10' 
            : 'border-gray-700 hover:border-gray-600'
          }
          ${isUploading ? 'pointer-events-none opacity-60' : 'cursor-pointer'}
        `}
        onClick={!isUploading && !selectedFile ? handleBrowseClick : undefined}
      >
        {/* Upload icon and text */}
        {!selectedFile && !isUploading && (
          <div className="flex flex-col items-center justify-center gap-4 text-center">
            <div className={`
              p-4 rounded-full transition-colors
              ${isDragging ? 'bg-racing-red/20' : 'bg-gray-800'}
            `}>
              <Upload 
                size={32} 
                className={isDragging ? 'text-racing-red' : 'text-gray-400'} 
              />
            </div>
            
            <div>
              <p className="text-lg font-semibold mb-1">
                {isDragging ? 'Drop CSV file here' : 'Drag & drop CSV file'}
              </p>
              <p className="text-sm text-gray-400">
                or{' '}
                <span className="text-racing-red hover:underline">
                  browse files
                </span>
              </p>
            </div>

            <div className="text-xs text-gray-500 space-y-1">
              <p>Maximum file size: {formatFileSize(config.maxUploadSizeBytes)}</p>
              <p>Supported format: CSV</p>
            </div>
          </div>
        )}

        {/* Selected file info */}
        {selectedFile && !isUploading && (
          <div className="flex items-start gap-4">
            <div className="p-3 bg-gray-800 rounded">
              <FileText size={24} className="text-racing-red" />
            </div>
            
            <div className="flex-1 min-w-0">
              <p className="font-semibold truncate">{selectedFile.name}</p>
              <p className="text-sm text-gray-400">
                {formatFileSize(selectedFile.size)}
              </p>
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation();
                handleClear();
              }}
              className="p-2 hover:bg-gray-800 rounded transition-colors"
              title="Remove file"
            >
              <X size={20} />
            </button>
          </div>
        )}

        {/* Upload progress */}
        {isUploading && (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gray-800 rounded">
                <FileText size={24} className="text-racing-red" />
              </div>
              
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">
                  {selectedFile?.name || 'Uploading...'}
                </p>
                <p className="text-sm text-gray-400">
                  Processing... {uploadProgress}%
                </p>
              </div>
            </div>

            {/* Progress bar */}
            <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-racing-red transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="mt-4 p-4 bg-red-900/20 border border-red-900/50 rounded flex items-start gap-3">
            <AlertCircle size={20} className="text-red-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-red-400 font-semibold mb-1">Upload Failed</p>
              <p className="text-sm text-red-300">{error}</p>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleClear();
              }}
              className="p-1 hover:bg-red-900/30 rounded transition-colors"
            >
              <X size={16} className="text-red-400" />
            </button>
          </div>
        )}
      </div>

      {/* Help text */}
      <div className="mt-4 text-xs text-gray-500 space-y-1">
        <p className="font-semibold text-gray-400">Required CSV columns:</p>
        <p>timestamp, speed, Steering_Angle, pbrake_f, pbrake_r, aps</p>
      </div>
    </div>
  );
}
