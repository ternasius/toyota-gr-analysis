/**
 * Toast Component
 * 
 * Displays temporary notification messages with optional action buttons.
 * Auto-dismisses after 5 seconds by default.
 * 
 * Requirements: 7.1, 7.4
 */

import { useEffect, useState } from 'react';
import { X, AlertCircle, CheckCircle, Info, AlertTriangle } from 'lucide-react';
import type { Toast as ToastType } from '../types/toast';

interface ToastProps {
  toast: ToastType;
  onDismiss: (id: string) => void;
}

/**
 * Get icon and color classes based on toast type
 */
function getToastStyles(type: ToastType['type']) {
  switch (type) {
    case 'success':
      return {
        icon: CheckCircle,
        bgColor: 'bg-green-900/90',
        borderColor: 'border-green-600',
        iconColor: 'text-green-400',
      };
    case 'error':
      return {
        icon: AlertCircle,
        bgColor: 'bg-red-900/90',
        borderColor: 'border-racing-red',
        iconColor: 'text-racing-red',
      };
    case 'warning':
      return {
        icon: AlertTriangle,
        bgColor: 'bg-yellow-900/90',
        borderColor: 'border-yellow-600',
        iconColor: 'text-yellow-400',
      };
    case 'info':
    default:
      return {
        icon: Info,
        bgColor: 'bg-blue-900/90',
        borderColor: 'border-blue-600',
        iconColor: 'text-blue-400',
      };
  }
}

export function Toast({ toast, onDismiss }: ToastProps) {
  const [isVisible, setIsVisible] = useState(false);
  const styles = getToastStyles(toast.type);
  const Icon = styles.icon;
  
  // Animate in on mount
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 10);
    return () => clearTimeout(timer);
  }, []);
  
  const handleDismiss = () => {
    setIsVisible(false);
    // Wait for animation to complete before removing
    setTimeout(() => onDismiss(toast.id), 300);
  };
  
  return (
    <div
      className={`
        flex items-start gap-3 p-4 rounded-lg border backdrop-blur-sm
        shadow-lg transition-all duration-300 ease-out
        ${styles.bgColor} ${styles.borderColor}
        ${isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-full'}
      `}
      role="alert"
      aria-live="polite"
    >
      {/* Icon */}
      <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${styles.iconColor}`} />
      
      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-white whitespace-pre-wrap break-words">
          {toast.message}
        </p>
        
        {/* Action button */}
        {toast.action && (
          <button
            onClick={() => {
              toast.action?.onClick();
              handleDismiss();
            }}
            className="mt-2 text-xs font-semibold text-white hover:text-racing-red transition-colors"
          >
            {toast.action.label}
          </button>
        )}
      </div>
      
      {/* Dismiss button */}
      <button
        onClick={handleDismiss}
        className="flex-shrink-0 text-gray-400 hover:text-white transition-colors"
        aria-label="Dismiss notification"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
