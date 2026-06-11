// Guards the sourced-itinerary promise: a sourcedTip must cite a clip the user
// actually has. The planner prompt forbids fabricated citations, but prompts
// are not guarantees — this filter is. Tolerant of the deep-partial objects
// produced mid-stream by streamObject.

import { TripPlan } from './types';

export function sanitizePlan<T extends Partial<TripPlan>>(plan: T, validTitles: string[]): T {
  if (!plan?.days) return plan;
  const titleSet = new Set(validTitles.map((t) => t.trim().toLowerCase()));
  return {
    ...plan,
    days: plan.days.map((day) => {
      if (!day?.activities) return day;
      return {
        ...day,
        activities: day.activities.map((activity) => {
          if (!activity?.sourcedTips) return activity;
          return {
            ...activity,
            sourcedTips: activity.sourcedTips.filter(
              (st) => !!st?.sourceTitle && titleSet.has(st.sourceTitle.trim().toLowerCase()),
            ),
          };
        }),
      };
    }),
  };
}
