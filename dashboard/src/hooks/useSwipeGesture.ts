/**
 * useSwipeGesture Hook
 * 
 * Detects swipe gestures for touch interactions.
 * Supports left, right, up, and down swipes.
 * 
 * Requirements: 6.6
 */

import { useEffect, useRef, useState } from 'react';

export type SwipeDirection = 'left' | 'right' | 'up' | 'down';

interface SwipeGestureOptions {
  onSwipe?: (direction: SwipeDirection) => void;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  minSwipeDistance?: number;
  maxSwipeTime?: number;
}

export function useSwipeGesture(options: SwipeGestureOptions = {}) {
  const {
    onSwipe,
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
    minSwipeDistance = 50,
    maxSwipeTime = 300,
  } = options;

  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const [isSwiping, setIsSwiping] = useState(false);

  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      touchStartRef.current = {
        x: touch.clientX,
        y: touch.clientY,
        time: Date.now(),
      };
      setIsSwiping(false);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!touchStartRef.current) return;
      
      const touch = e.touches[0];
      const deltaX = Math.abs(touch.clientX - touchStartRef.current.x);
      const deltaY = Math.abs(touch.clientY - touchStartRef.current.y);
      
      // Consider it a swipe if moved more than 10px
      if (deltaX > 10 || deltaY > 10) {
        setIsSwiping(true);
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (!touchStartRef.current) return;

      const touch = e.changedTouches[0];
      const deltaX = touch.clientX - touchStartRef.current.x;
      const deltaY = touch.clientY - touchStartRef.current.y;
      const deltaTime = Date.now() - touchStartRef.current.time;

      // Check if swipe meets criteria
      if (deltaTime <= maxSwipeTime) {
        const absX = Math.abs(deltaX);
        const absY = Math.abs(deltaY);

        // Determine if horizontal or vertical swipe
        if (absX > absY && absX >= minSwipeDistance) {
          // Horizontal swipe
          const direction: SwipeDirection = deltaX > 0 ? 'right' : 'left';
          onSwipe?.(direction);
          
          if (direction === 'left') {
            onSwipeLeft?.();
          } else {
            onSwipeRight?.();
          }
        } else if (absY > absX && absY >= minSwipeDistance) {
          // Vertical swipe
          const direction: SwipeDirection = deltaY > 0 ? 'down' : 'up';
          onSwipe?.(direction);
          
          if (direction === 'up') {
            onSwipeUp?.();
          } else {
            onSwipeDown?.();
          }
        }
      }

      touchStartRef.current = null;
      setIsSwiping(false);
    };

    // Add event listeners
    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: true });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [onSwipe, onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown, minSwipeDistance, maxSwipeTime]);

  return { isSwiping };
}
