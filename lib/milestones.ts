const MILESTONES: Record<number, string> = {
  1:   "First clip saved! 🎉 Your adventure collection starts here.",
  5:   "5 places saved! You're building something special ✈️",
  10:  "10 clips — enough to plan a trip! 🗺 Try the trip planner.",
  25:  "25 places! You're a seasoned explorer 🏔",
  50:  "50 clips! Power user mode activated 🔥",
  100: "100 places saved 🌏 That's a lifetime of adventures.",
};

const STORAGE_KEY = 'tp_milestones_seen';

function getSeenMilestones(): Set<number> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as number[]);
  } catch {
    return new Set();
  }
}

function markMilestoneSeen(count: number): void {
  try {
    const seen = getSeenMilestones();
    seen.add(count);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(seen)));
  } catch {
    // ignore storage errors
  }
}

export function checkMilestone(clipCount: number): string | null {
  const message = MILESTONES[clipCount];
  if (!message) return null;
  const seen = getSeenMilestones();
  if (seen.has(clipCount)) return null;
  markMilestoneSeen(clipCount);
  return message;
}
