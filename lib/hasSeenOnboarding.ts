const KEY = 'tp_onboarded';

export function hasOnboarded(): boolean {
  if (typeof window === 'undefined') return true;
  return localStorage.getItem(KEY) === 'true';
}

export function markOnboarded(): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(KEY, 'true');
}
