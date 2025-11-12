/**
 * LiveRegion Component
 * 
 * ARIA live region for announcing dynamic updates to screen readers.
 * Used for accessibility to notify users of data changes without visual interruption.
 * 
 * Requirements: 16.1 (ARIA live regions for dynamic updates)
 */

import { useEffect, useState } from 'react';

interface LiveRegionProps {
  message: string;
  politeness?: 'polite' | 'assertive';
  clearDelay?: number;
}

/**
 * LiveRegion component that announces messages to screen readers
 * Messages are automatically cleared after a delay to prevent clutter
 */
export function LiveRegion({ 
  message, 
  politeness = 'polite',
  clearDelay = 3000 
}: LiveRegionProps) {
  const [currentMessage, setCurrentMessage] = useState('');

  useEffect(() => {
    if (message) {
      setCurrentMessage(message);
      
      // Clear message after delay
      const timer = setTimeout(() => {
        setCurrentMessage('');
      }, clearDelay);
      
      return () => clearTimeout(timer);
    }
  }, [message, clearDelay]);

  return (
    <div
      role="status"
      aria-live={politeness}
      aria-atomic="true"
      className="sr-only"
    >
      {currentMessage}
    </div>
  );
}

/**
 * Hook to manage live region announcements
 */
export function useLiveRegion() {
  const [message, setMessage] = useState('');

  const announce = (newMessage: string) => {
    setMessage(newMessage);
  };

  return { message, announce };
}
