'use client';

import type { SavedItem } from './types';
import type { TripPlan } from './types';

export interface ShareableClip {
  title: string;
  url: string;
  description?: string;
}

export interface ShareablePlan {
  boardName: string;
  planName: string;
  overview: string;
  days: number;
}

// Returns true if the native share sheet is available (iOS/Android)
export function canShare(): boolean {
  return typeof navigator !== 'undefined' && 'share' in navigator;
}

// Share a saved clip — opens the native iOS/Android share sheet
export async function shareClip(item: ShareableClip): Promise<boolean> {
  if (!canShare()) {
    return copyToClipboard(item.url);
  }
  try {
    await navigator.share({
      title: item.title,
      text: item.description ? `${item.description}\n\nvia TravelPanel` : `Saved on TravelPanel: ${item.title}`,
      url: item.url,
    });
    return true;
  } catch (e) {
    // AbortError = user cancelled — not an error
    if ((e as Error).name !== 'AbortError') {
      return copyToClipboard(item.url);
    }
    return false;
  }
}

// Share a trip plan as text summary
export async function sharePlan(boardName: string, plan: TripPlan): Promise<boolean> {
  const dayLines = plan.days
    .map((d) => {
      const activities = d.activities.map((a) => `  • ${a.time} ${a.name}`).join('\n');
      return `Day ${d.day} — ${d.theme}\n${activities}`;
    })
    .join('\n\n');

  const text = `🗺 ${boardName} — ${plan.days.length}-day itinerary\n\n${plan.overview}\n\n${dayLines}\n\nPlanned with TravelPanel`;

  if (!canShare()) {
    return copyToClipboard(text);
  }
  try {
    await navigator.share({ title: `${boardName} itinerary`, text });
    return true;
  } catch (e) {
    if ((e as Error).name !== 'AbortError') {
      return copyToClipboard(text);
    }
    return false;
  }
}

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
