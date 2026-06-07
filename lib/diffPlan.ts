import { TripPlan } from './types';

export interface PlanDiff {
  added: number;
  removed: number;
  total: number;
}

/** Compares two plan versions by activity names. Pure client-side diff. */
export function diffPlans(oldPlan: TripPlan, newPlan: TripPlan): PlanDiff {
  const oldNames = new Set(oldPlan.days.flatMap((d) => d.activities.map((a) => a.name)));
  const newNames = new Set(newPlan.days.flatMap((d) => d.activities.map((a) => a.name)));

  let added = 0;
  let removed = 0;
  for (const name of newNames) if (!oldNames.has(name)) added++;
  for (const name of oldNames) if (!newNames.has(name)) removed++;

  return { added, removed, total: added + removed };
}
