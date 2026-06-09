'use client';

import { useState, useEffect } from 'react';
import OnboardingModal from './OnboardingModal';

export default function OnboardingController() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem('tp_onboarded')) {
        setOpen(true);
      }
    } catch {}
  }, []);

  function handleClose() {
    try {
      localStorage.setItem('tp_onboarded', '1');
    } catch {}
    setOpen(false);
  }

  return <OnboardingModal open={open} onClose={handleClose} />;
}
