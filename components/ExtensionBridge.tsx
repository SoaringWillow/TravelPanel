'use client';

import { useEffect } from 'react';
import { initExtensionBridge } from '@/lib/extensionBridge';

export function ExtensionBridge() {
  useEffect(() => {
    initExtensionBridge();
  }, []);
  return null;
}
