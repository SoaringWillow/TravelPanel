const STREAK_KEY = 'clip_streak_days';
const MILESTONES = [3, 7, 30];

type StreakDay = { date: string; count: number };

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function yesterdayStr(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

function loadDays(): StreakDay[] {
  try {
    return JSON.parse(localStorage.getItem(STREAK_KEY) ?? '[]') as StreakDay[];
  } catch {
    return [];
  }
}

function saveDays(days: StreakDay[]): void {
  // Keep last 60 days to cap storage
  const trimmed = days.slice(-60);
  localStorage.setItem(STREAK_KEY, JSON.stringify(trimmed));
}

export function recordClip(): { newStreak: number; hitMilestone: number | null } {
  const days = loadDays();
  const today = todayStr();
  const existing = days.find((d) => d.date === today);
  if (existing) {
    existing.count += 1;
  } else {
    days.push({ date: today, count: 1 });
  }
  saveDays(days);

  const streak = computeStreak(days);
  const hitMilestone = MILESTONES.includes(streak) && !existing ? streak : null;
  return { newStreak: streak, hitMilestone };
}

export function computeStreak(days?: StreakDay[]): number {
  const d = days ?? loadDays();
  if (d.length === 0) return 0;

  const sorted = [...d].sort((a, b) => b.date.localeCompare(a.date));
  const today = todayStr();
  const yesterday = yesterdayStr();

  // If no clip today or yesterday, streak is broken
  if (sorted[0].date !== today && sorted[0].date !== yesterday) return 0;

  let streak = 0;
  let expected = sorted[0].date === today ? today : yesterday;
  for (const day of sorted) {
    if (day.date === expected) {
      streak++;
      const d2 = new Date(expected);
      d2.setDate(d2.getDate() - 1);
      expected = d2.toISOString().slice(0, 10);
    } else {
      break;
    }
  }
  return streak;
}

export function getDaysSinceLastClip(): number {
  const days = loadDays();
  if (days.length === 0) return Infinity;
  const sorted = [...days].sort((a, b) => b.date.localeCompare(a.date));
  const last = new Date(sorted[0].date);
  const now = new Date();
  return Math.floor((now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24));
}
