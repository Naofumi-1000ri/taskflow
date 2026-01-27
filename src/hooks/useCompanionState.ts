'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';

export type TimePeriod = 'morning' | 'afternoon' | 'evening' | 'night';

function getTimePeriod(hour: number): TimePeriod {
  if (hour >= 5 && hour <= 11) return 'morning';
  if (hour >= 12 && hour <= 16) return 'afternoon';
  if (hour >= 17 && hour <= 23) return 'evening';
  return 'night';
}

function getTodayKey(prefix: string): string {
  const now = new Date();
  const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  return `${prefix}_${dateStr}`;
}

export function useCompanionState() {
  const [currentHour, setCurrentHour] = useState(() => new Date().getHours());
  const [morningGreeted, setMorningGreeted] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(getTodayKey('companion_morning')) === 'true';
  });
  const [eveningReported, setEveningReported] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(getTodayKey('companion_evening')) === 'true';
  });

  // Update hour every 5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      const newHour = new Date().getHours();
      setCurrentHour(newHour);

      // Reset flags if day changed (keys are date-based, so re-check localStorage)
      setMorningGreeted(localStorage.getItem(getTodayKey('companion_morning')) === 'true');
      setEveningReported(localStorage.getItem(getTodayKey('companion_evening')) === 'true');
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  const timePeriod = useMemo(() => getTimePeriod(currentHour), [currentHour]);

  const shouldShowMorningGreeting = timePeriod === 'morning' && !morningGreeted;
  const shouldShowEveningReport = timePeriod === 'evening' && !eveningReported;

  const markMorningGreeted = useCallback(() => {
    localStorage.setItem(getTodayKey('companion_morning'), 'true');
    setMorningGreeted(true);
  }, []);

  const markEveningReported = useCallback(() => {
    localStorage.setItem(getTodayKey('companion_evening'), 'true');
    setEveningReported(true);
  }, []);

  const hasBadge = shouldShowMorningGreeting || shouldShowEveningReport;

  return {
    timePeriod,
    currentHour,
    shouldShowMorningGreeting,
    shouldShowEveningReport,
    markMorningGreeted,
    markEveningReported,
    hasBadge,
  };
}
