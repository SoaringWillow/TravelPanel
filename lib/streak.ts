'use client';

import { SavedItem } from './types';

export interface StreakStats {
  total: number;
  thisWeek: number;
  thisMonth: number;
  currentStreak: number;
  longestStreak: number;
}

function weekKey(ts: number): string {
  const d = new Date(ts);
  const jan1 = new Date(d.getFullYear(), 0, 1);
  const week = Math.ceil(((d.getTime() - jan1.getTime()) / 86400000 + jan1.getDay() + 1) / 7);
  return `${d.getFullYear()}-W${week}`;
}

function monthKey(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${d.getMonth()}`;
}

export function computeStreakStats(items: SavedItem[]): StreakStats {
  const now = Date.now();
  const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
  const monthAgo = now - 30 * 24 * 60 * 60 * 1000;

  const total = items.length;
  const thisWeek = items.filter((i) => i.savedAt >= weekAgo).length;
  const thisMonth = items.filter((i) => i.savedAt >= monthAgo).length;

  // Build a set of week keys for all items
  const weekSet = new Set(items.map((i) => weekKey(i.savedAt)));

  // Current consecutive streak ending at current week
  const currentWeekKey = weekKey(now);
  let streak = 0;
  let cursor = new Date(now);
  while (true) {
    const key = weekKey(cursor.getTime());
    if (!weekSet.has(key)) break;
    streak++;
    cursor = new Date(cursor.getTime() - 7 * 24 * 60 * 60 * 1000);
    if (streak > 52) break;
  }
  // If current week has no clips, start counting from last week
  if (!weekSet.has(currentWeekKey)) {
    streak = 0;
    cursor = new Date(now - 7 * 24 * 60 * 60 * 1000);
    while (true) {
      const key = weekKey(cursor.getTime());
      if (!weekSet.has(key)) break;
      streak++;
      cursor = new Date(cursor.getTime() - 7 * 24 * 60 * 60 * 1000);
      if (streak > 52) break;
    }
  }

  // Longest streak: iterate sorted week keys
  const sortedWeeks = Array.from(weekSet).sort();
  let longest = 0;
  let run = 0;
  for (let i = 0; i < sortedWeeks.length; i++) {
    if (i === 0) {
      run = 1;
    } else {
      const prev = new Date(sortedWeeks[i - 1].replace('W', ''));
      const curr = new Date(sortedWeeks[i].replace('W', ''));
      run = (curr.getTime() - prev.getTime()) <= 8 * 24 * 60 * 60 * 1000 ? run + 1 : 1;
    }
    if (run > longest) longest = run;
  }

  // Cache in localStorage
  try {
    localStorage.setItem('streak_cache', JSON.stringify({ currentStreak: streak, longestStreak: longest, computedAt: now }));
  } catch {}

  return { total, thisWeek, thisMonth, currentStreak: streak, longestStreak: longest };
}
