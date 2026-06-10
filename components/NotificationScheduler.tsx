'use client';

import { useEffect } from 'react';
import { maybeShowDailyNotif } from '@/lib/notifications';
import { getAllItems } from '@/lib/db';

export function NotificationScheduler() {
  useEffect(() => {
    getAllItems()
      .then((items) => maybeShowDailyNotif(items.length))
      .catch(() => {});
  }, []);

  return null;
}
