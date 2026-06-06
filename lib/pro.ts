const PRO_KEY = 'proUnlocked';

export function isPro(): boolean {
  try {
    return localStorage.getItem(PRO_KEY) === '1';
  } catch {
    return false;
  }
}

// Dev-only: unlock pro for testing
export function devUnlockPro(): void {
  if (process.env.NODE_ENV !== 'production') {
    localStorage.setItem(PRO_KEY, '1');
  }
}

export const PRO_FEATURES = [
  { icon: '✨', label: 'Unlimited AI trip plans', detail: 'No daily limit — plan as many trips as you want' },
  { icon: '🔗', label: 'Share boards with friends', detail: 'Send a link to your board; friends can view it' },
  { icon: '⚡', label: 'Priority enrichment', detail: 'Clips extract 2× faster — no queue' },
  { icon: '🌙', label: 'Dark mode', detail: 'Easier on the eyes at night' },
  { icon: '📤', label: 'Unlimited exports', detail: 'PDF, calendar, and future export formats' },
  { icon: '☁️', label: 'Cloud sync', detail: 'Your clips sync across all your devices' },
] as const;

export const PRO_PRICE = '$4.99/month';
