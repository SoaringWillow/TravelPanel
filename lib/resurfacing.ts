'use client';

import { SavedItem } from './types';

const STORAGE_KEY = 'travelPanelUpcomingTrip';
const REMINDER_DAYS = 14;

export interface UpcomingTrip {
  destination: string;
  departureDate: string; // ISO date string YYYY-MM-DD
  boardId?: string;
}

export function getUpcomingTrip(): UpcomingTrip | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as UpcomingTrip) : null;
  } catch {
    return null;
  }
}

export function setUpcomingTrip(trip: UpcomingTrip | null): void {
  try {
    if (trip) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(trip));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch { /* localStorage unavailable */ }
}

export function daysUntilDeparture(departureDate: string): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const dep = new Date(departureDate + 'T00:00:00');
  return Math.ceil((dep.getTime() - now.getTime()) / 86400000);
}

export function shouldShowReminder(trip: UpcomingTrip | null): boolean {
  if (!trip) return false;
  const days = daysUntilDeparture(trip.departureDate);
  return days >= 0 && days <= REMINDER_DAYS;
}

export function getResurfacedClips(items: SavedItem[], boardId?: string): SavedItem[] {
  const pool = boardId
    ? items.filter((i) => i.boardId === boardId && !i.isDemo)
    : items.filter((i) => !i.isDemo);
  return pool
    .filter((i) => i.locations.length > 0)
    .sort((a, b) => (b.substance?.length ?? 0) - (a.substance?.length ?? 0))
    .slice(0, 5);
}
