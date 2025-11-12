/**
 * useTouchDevice Hook
 * 
 * Detects if the current device supports touch input.
 * Useful for optimizing UI for touch vs mouse interactions.
 * 
 * Requirements: 6.6
 */

import { useEffect, useState } from 'react';

export function useTouchDevice(): boolean {
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  useEffect(() => {
    // Check if device supports touch
    const hasTouch = 
      'ontouchstart' in window ||
      navigator.maxTouchPoints > 0 ||
      // @ts-ignore - for older browsers
      navigator.msMaxTouchPoints > 0;

    setIsTouchDevice(hasTouch);
  }, []);

  return isTouchDevice;
}
