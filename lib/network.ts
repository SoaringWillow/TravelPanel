'use client';

export function isOnline(): boolean {
  return typeof navigator !== 'undefined' ? navigator.onLine : true;
}

export function waitForOnline(): Promise<void> {
  if (isOnline()) return Promise.resolve();
  return new Promise((resolve) => {
    function onOnline() {
      window.removeEventListener('online', onOnline);
      resolve();
    }
    window.addEventListener('online', onOnline);
  });
}
