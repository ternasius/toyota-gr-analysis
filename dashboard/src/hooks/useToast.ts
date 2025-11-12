/**
 * useToast Hook
 * 
 * Convenience hook for showing toast notifications with common patterns.
 * Provides helper methods for network errors, worker errors, and general messages.
 * 
 * Requirements: 7.1, 7.4
 */

import { useCallback } from 'react';
import { useToastStore } from '../store/useToastStore';
import type { ToastType } from '../types/toast';

export function useToast() {
  const { addToast } = useToastStore();
  
  /**
   * Show a generic toast message
   */
  const showToast = useCallback((
    message: string,
    type: ToastType = 'info',
    options?: {
      duration?: number;
      action?: {
        label: string;
        onClick: () => void;
      };
    }
  ) => {
    addToast({
      type,
      message,
      duration: options?.duration,
      action: options?.action,
    });
  }, [addToast]);
  
  /**
   * Show a network error toast with retry button
   * Requirement 7.1: Show toasts for network errors with retry button
   */
  const showNetworkError = useCallback((
    error: Error | string,
    onRetry?: () => void
  ) => {
    const message = typeof error === 'string' ? error : error.message;
    
    addToast({
      type: 'error',
      message: `Network Error: ${message}`,
      action: onRetry ? {
        label: 'Retry',
        onClick: onRetry,
      } : undefined,
      duration: 0, // Don't auto-dismiss network errors
    });
  }, [addToast]);
  
  /**
   * Show a worker error toast
   * Requirement 7.4: Show toasts for worker errors
   */
  const showWorkerError = useCallback((
    error: Error | string,
    lapId?: string
  ) => {
    const message = typeof error === 'string' ? error : error.message;
    const fullMessage = lapId 
      ? `Worker Error (Lap ${lapId}): ${message}`
      : `Worker Error: ${message}`;
    
    addToast({
      type: 'error',
      message: fullMessage,
      duration: 7000, // Slightly longer for worker errors
    });
  }, [addToast]);
  
  /**
   * Show a success toast
   */
  const showSuccess = useCallback((message: string) => {
    addToast({
      type: 'success',
      message,
      duration: 3000, // Shorter for success messages
    });
  }, [addToast]);
  
  /**
   * Show a warning toast
   */
  const showWarning = useCallback((message: string, duration?: number) => {
    addToast({
      type: 'warning',
      message,
      duration: duration ?? 5000,
    });
  }, [addToast]);
  
  /**
   * Show an error toast
   */
  const showError = useCallback((error: Error | string, duration?: number) => {
    const message = typeof error === 'string' ? error : error.message;
    
    addToast({
      type: 'error',
      message,
      duration: duration ?? 5000,
    });
  }, [addToast]);
  
  return {
    showToast,
    showNetworkError,
    showWorkerError,
    showSuccess,
    showWarning,
    showError,
  };
}
