/**
 * ToastContainer Component
 * 
 * Container for displaying toast notifications in a fixed position.
 * Manages the rendering of all active toasts.
 * 
 * Requirements: 7.1, 7.4
 */

import { useToastStore } from '../store/useToastStore';
import { Toast } from './Toast';

export function ToastContainer() {
  const { toasts, removeToast } = useToastStore();
  
  if (toasts.length === 0) {
    return null;
  }
  
  return (
    <div
      className="fixed top-20 right-4 z-50 flex flex-col gap-2 max-w-md w-full pointer-events-none"
      aria-live="polite"
      aria-atomic="false"
    >
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <Toast toast={toast} onDismiss={removeToast} />
        </div>
      ))}
    </div>
  );
}
