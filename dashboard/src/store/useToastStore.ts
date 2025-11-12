/**
 * Toast Store
 * 
 * Zustand store for managing toast notifications.
 * Provides methods to add, remove, and clear toast messages.
 * 
 * Requirements: 7.1, 7.4
 */

import { create } from 'zustand';
import type { ToastStore, Toast } from '../types/toast';

/**
 * Generate a unique ID for a toast
 */
function generateToastId(): string {
  return `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Create the toast store
 */
export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  
  /**
   * Add a new toast notification
   * Auto-dismisses after 5 seconds by default (Requirement 7.1)
   */
  addToast: (toast) => {
    const id = generateToastId();
    const duration = toast.duration ?? 5000; // Default 5 seconds
    
    const newToast: Toast = {
      ...toast,
      id,
    };
    
    set((state) => ({
      toasts: [...state.toasts, newToast],
    }));
    
    // Auto-dismiss after duration
    if (duration > 0) {
      setTimeout(() => {
        set((state) => ({
          toasts: state.toasts.filter((t) => t.id !== id),
        }));
      }, duration);
    }
  },
  
  /**
   * Remove a specific toast by ID
   */
  removeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }));
  },
  
  /**
   * Clear all toasts
   */
  clearAll: () => {
    set({ toasts: [] });
  },
}));
