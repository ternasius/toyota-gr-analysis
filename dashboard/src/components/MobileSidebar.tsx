/**
 * MobileSidebar Component
 * 
 * Bottom sheet/modal sidebar for mobile devices (< 768px).
 * Provides collapsible access to driver selection and statistics.
 * Supports swipe-down gesture to close (Requirement 6.6).
 * 
 * Requirements: 6.5, 6.6
 */

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { useEscapeKey, useFocusTrap } from '../hooks/useKeyboardShortcuts';

interface MobileSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  position?: 'bottom' | 'full';
}

export function MobileSidebar({
  isOpen,
  onClose,
  title,
  children,
  position = 'bottom',
}: MobileSidebarProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [dragOffset, setDragOffset] = useState(0);
  const touchStartRef = useRef<{ y: number; scrollTop: number } | null>(null);

  // Handle Escape key to close sidebar (Requirement 16.2)
  useEscapeKey(onClose, isOpen);

  // Trap focus within sidebar (Requirement 16.2)
  useFocusTrap(panelRef, isOpen);

  // Prevent body scroll when sidebar is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Handle swipe-down to close gesture (Requirement 6.6)
  useEffect(() => {
    if (!isOpen || position !== 'bottom') return;

    const panel = panelRef.current;
    if (!panel) return;

    const handleTouchStart = (e: TouchEvent) => {
      const contentDiv = panel.querySelector('[data-content]') as HTMLDivElement;
      if (!contentDiv) return;

      touchStartRef.current = {
        y: e.touches[0].clientY,
        scrollTop: contentDiv.scrollTop,
      };
      setDragOffset(0);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!touchStartRef.current) return;

      const contentDiv = panel.querySelector('[data-content]') as HTMLDivElement;
      if (!contentDiv) return;

      const deltaY = e.touches[0].clientY - touchStartRef.current.y;
      
      // Only allow drag down if at top of scroll
      if (contentDiv.scrollTop === 0 && deltaY > 0) {
        e.preventDefault();
        setDragOffset(deltaY);
      }
    };

    const handleTouchEnd = () => {
      if (!touchStartRef.current) return;

      // Close if dragged down more than 100px
      if (dragOffset > 100) {
        onClose();
      }

      touchStartRef.current = null;
      setDragOffset(0);
    };

    panel.addEventListener('touchstart', handleTouchStart, { passive: true });
    panel.addEventListener('touchmove', handleTouchMove, { passive: false });
    panel.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      panel.removeEventListener('touchstart', handleTouchStart);
      panel.removeEventListener('touchmove', handleTouchMove);
      panel.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isOpen, position, onClose, dragOffset]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 z-40 md:hidden"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sidebar Panel */}
      <div
        ref={panelRef}
        className={`
          fixed z-50 bg-racing-bg border-gray-800 md:hidden
          ${position === 'bottom' 
            ? 'bottom-0 left-0 right-0 border-t rounded-t-2xl max-h-[80vh]' 
            : 'inset-0'
          }
          animate-slide-up transition-transform
        `}
        style={{
          transform: dragOffset > 0 ? `translateY(${dragOffset}px)` : undefined,
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="mobile-sidebar-title"
      >
        {/* Drag Handle (for bottom sheets) */}
        {position === 'bottom' && (
          <div className="flex justify-center pt-2 pb-1">
            <div className="w-12 h-1 bg-gray-700 rounded-full" />
          </div>
        )}

        {/* Header */}
        <div className="sticky top-0 bg-racing-bg border-b border-gray-800 px-4 py-3 flex items-center justify-between">
          <h2
            id="mobile-sidebar-title"
            className="text-sm uppercase tracking-wide text-white font-bold"
          >
            {title}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-racing-red/50 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label="Close sidebar (Esc)"
          >
            <X size={20} className="text-gray-400" aria-hidden="true" />
          </button>
        </div>

        {/* Content */}
        <div 
          data-content
          className="overflow-y-auto" 
          style={{ maxHeight: position === 'bottom' ? 'calc(80vh - 80px)' : 'calc(100vh - 60px)' }}
        >
          {children}
        </div>
      </div>
    </>
  );
}
