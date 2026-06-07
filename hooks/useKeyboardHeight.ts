'use client';

import { useState, useEffect } from 'react';

/**
 * Returns the current virtual keyboard height in px using the
 * Visual Viewport API. Returns 0 when keyboard is closed or API
 * is unavailable (desktop / older browsers).
 */
export function useKeyboardHeight(): number {
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.visualViewport) return;

    const vv = window.visualViewport;

    function updateHeight() {
      // keyboardHeight = difference between layout viewport and visual viewport
      const layoutHeight = window.innerHeight;
      const visualHeight = vv!.height;
      const height = Math.max(0, layoutHeight - visualHeight - (vv!.offsetTop ?? 0));
      setKeyboardHeight(Math.round(height));
    }

    vv.addEventListener('resize', updateHeight);
    vv.addEventListener('scroll', updateHeight);
    updateHeight();

    return () => {
      vv.removeEventListener('resize', updateHeight);
      vv.removeEventListener('scroll', updateHeight);
    };
  }, []);

  return keyboardHeight;
}
