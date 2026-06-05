// Pro tier gate — initially always false; Supabase subscription check slots in here

type ProFeature = 'planGen' | 'visionExtract' | 'boardImport';

const LIMITS: Record<ProFeature, number> = {
  planGen: 3,
  visionExtract: 5,
  boardImport: 10,
};

function monthKey(feature: ProFeature): string {
  const now = new Date();
  return `proUsage_${feature}_${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export function isPro(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem('travelpanel_pro') === 'true';
}

export function getUsage(feature: ProFeature): { count: number; limit: number; exceeded: boolean } {
  if (typeof window === 'undefined') return { count: 0, limit: LIMITS[feature], exceeded: false };
  const count = parseInt(localStorage.getItem(monthKey(feature)) ?? '0', 10);
  const limit = LIMITS[feature];
  return { count, limit, exceeded: !isPro() && count >= limit };
}

export function incrementUsage(feature: ProFeature): { exceeded: boolean } {
  if (isPro()) return { exceeded: false };
  const key = monthKey(feature);
  const current = parseInt(localStorage.getItem(key) ?? '0', 10);
  localStorage.setItem(key, String(current + 1));
  const limit = LIMITS[feature];
  return { exceeded: current + 1 > limit };
}

export function checkBeforeUse(feature: ProFeature): { allowed: boolean } {
  if (isPro()) return { allowed: true };
  const { exceeded } = getUsage(feature);
  return { allowed: !exceeded };
}

export async function recordWaitlistEmail(email: string): Promise<void> {
  await fetch('/api/waitlist', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
}
