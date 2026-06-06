const LAST_CLIP_KEY    = 'streakLastClipDate';
const CURRENT_KEY      = 'streakCurrent';
const LONGEST_KEY      = 'streakLongest';
const HISTORY_KEY      = 'streakHistory'; // JSON array of ISO date strings

function todayStr(): string {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

function yesterdayStr(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

export interface StreakInfo {
  current: number;
  longest: number;
  history: string[]; // last 30 days that had at least 1 clip
}

export function getStreakInfo(): StreakInfo {
  try {
    return {
      current: parseInt(localStorage.getItem(CURRENT_KEY) ?? '0', 10),
      longest: parseInt(localStorage.getItem(LONGEST_KEY) ?? '0', 10),
      history: JSON.parse(localStorage.getItem(HISTORY_KEY) ?? '[]'),
    };
  } catch {
    return { current: 0, longest: 0, history: [] };
  }
}

export function incrementStreak(): StreakInfo {
  try {
    const today = todayStr();
    const yesterday = yesterdayStr();
    const last = localStorage.getItem(LAST_CLIP_KEY);

    let current = parseInt(localStorage.getItem(CURRENT_KEY) ?? '0', 10);
    let longest = parseInt(localStorage.getItem(LONGEST_KEY) ?? '0', 10);
    let history: string[] = JSON.parse(localStorage.getItem(HISTORY_KEY) ?? '[]');

    if (last === today) {
      // Already clipped today — no change to streak count
    } else if (last === yesterday) {
      // Consecutive day — extend streak
      current += 1;
    } else {
      // Gap or first clip ever
      current = 1;
    }

    longest = Math.max(longest, current);

    // Add today to history (dedup, keep last 30 days)
    if (!history.includes(today)) {
      history = [today, ...history].slice(0, 30);
    }

    localStorage.setItem(LAST_CLIP_KEY, today);
    localStorage.setItem(CURRENT_KEY, String(current));
    localStorage.setItem(LONGEST_KEY, String(longest));
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));

    return { current, longest, history };
  } catch {
    return { current: 0, longest: 0, history: [] };
  }
}

export function wasStreakBroken(): boolean {
  try {
    const last = localStorage.getItem(LAST_CLIP_KEY);
    if (!last) return false;
    const today = todayStr();
    const yesterday = yesterdayStr();
    const current = parseInt(localStorage.getItem(CURRENT_KEY) ?? '0', 10);
    // Streak was broken if last clip was before yesterday and streak was > 0
    return current === 1 && last !== today && last !== yesterday;
  } catch {
    return false;
  }
}
