const PRO_KEY = 'tp_is_pro';

export function isProUser(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(PRO_KEY) === 'true';
}

export function setProUser(v: boolean): void {
  if (typeof window === 'undefined') return;
  if (v) {
    localStorage.setItem(PRO_KEY, 'true');
  } else {
    localStorage.removeItem(PRO_KEY);
  }
}

export const PRO_LIMITS = {
  plansPerDay: 5,
  tripsPerBoard: 3,
} as const;
