'use client';

import { useState, useEffect } from 'react';

export function useKeyboardAvoid(): number {
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;

    function onResize() {
      const windowHeight = window.innerHeight;
      const viewportHeight = viewport!.height;
      const offset = Math.max(0, windowHeight - viewportHeight - (viewport!.offsetTop ?? 0));
      setKeyboardHeight(offset);
    }

    viewport.addEventListener('resize', onResize);
    viewport.addEventListener('scroll', onResize);
    onResize();

    return () => {
      viewport.removeEventListener('resize', onResize);
      viewport.removeEventListener('scroll', onResize);
    };
  }, []);

  return keyboardHeight;
}
