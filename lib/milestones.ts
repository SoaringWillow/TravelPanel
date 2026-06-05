const MILESTONES: Record<number, string> = {
  1:  '🎉 First clip saved! Now try the trip planner.',
  5:  '✨ 5 clips — you\'re building a great collection!',
  10: '🗺️ 10 clips! Ready to plan your first trip?',
  25: '🌟 25 clips — you\'re a TravelPanel power user!',
  50: '🏆 50 clips saved. Your travel library is impressive!',
};

const COUNT_KEY = 'totalClipsSaved';

export function recordClipSaved(): { milestone: string | null } {
  if (typeof window === 'undefined') return { milestone: null };
  const prev = parseInt(localStorage.getItem(COUNT_KEY) ?? '0', 10);
  const next = prev + 1;
  localStorage.setItem(COUNT_KEY, String(next));
  return { milestone: MILESTONES[next] ?? null };
}

export function getTotalClipsSaved(): number {
  if (typeof window === 'undefined') return 0;
  return parseInt(localStorage.getItem(COUNT_KEY) ?? '0', 10);
}
