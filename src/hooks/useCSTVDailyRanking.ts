import { useState, useEffect, useCallback, useRef } from 'react';

interface UseCSTVDailyRankingOptions {
  enabled?: boolean;
  onTrigger: () => void;
}

/**
 * Hook that triggers a callback at 17:00 Brasília time every day.
 * Uses localStorage to prevent showing multiple times on the same day.
 */
export function useCSTVDailyRanking({ enabled = true, onTrigger }: UseCSTVDailyRankingOptions) {
  const [isTimeToShow, setIsTimeToShow] = useState(false);
  const hasTriggeredRef = useRef(false);

  const getBrasiliaTime = useCallback(() => {
    const now = new Date();
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const brasilia = new Date(utc - (3 * 60 * 60 * 1000));
    return brasilia;
  }, []);

  const getTodayKey = useCallback(() => {
    const brasilia = getBrasiliaTime();
    const year = brasilia.getFullYear();
    const month = String(brasilia.getMonth() + 1).padStart(2, '0');
    const day = String(brasilia.getDate()).padStart(2, '0');
    return `cs-tv-daily-ranking-shown-${year}-${month}-${day}`;
  }, [getBrasiliaTime]);

  const hasShownToday = useCallback(() => {
    const key = getTodayKey();
    return localStorage.getItem(key) === 'shown';
  }, [getTodayKey]);

  const markAsShown = useCallback(() => {
    const key = getTodayKey();
    localStorage.setItem(key, 'shown');
  }, [getTodayKey]);

  const checkTime = useCallback(() => {
    if (!enabled) return false;
    if (hasTriggeredRef.current) return false;

    const brasilia = getBrasiliaTime();
    const hours = brasilia.getHours();
    const minutes = brasilia.getMinutes();

    // Check if it's exactly 17:00 (within the first minute)
    const is5PM = hours === 17 && minutes === 0;

    if (is5PM && !hasShownToday()) {
      console.log('[useCSTVDailyRanking] 17:00 Brasília detected, triggering ranking!');
      hasTriggeredRef.current = true;
      markAsShown();
      setIsTimeToShow(true);
      onTrigger();
      return true;
    }

    return false;
  }, [enabled, getBrasiliaTime, hasShownToday, markAsShown, onTrigger]);

  // Check time every 30 seconds
  useEffect(() => {
    if (!enabled) return;

    // Initial check
    checkTime();

    // Set up interval to check every 30 seconds
    const interval = setInterval(() => {
      checkTime();
    }, 30000);

    return () => clearInterval(interval);
  }, [enabled, checkTime]);

  // Reset trigger flag at midnight (Brasília)
  useEffect(() => {
    if (!enabled) return;

    const checkMidnight = () => {
      const brasilia = getBrasiliaTime();
      if (brasilia.getHours() === 0 && brasilia.getMinutes() === 0) {
        hasTriggeredRef.current = false;
        setIsTimeToShow(false);
      }
    };

    const interval = setInterval(checkMidnight, 60000);
    return () => clearInterval(interval);
  }, [enabled, getBrasiliaTime]);

  // Manual trigger for testing (bypasses localStorage check)
  const triggerManually = useCallback(() => {
    console.log('[useCSTVDailyRanking] Manual trigger!');
    setIsTimeToShow(true);
    onTrigger();
  }, [onTrigger]);

  const reset = useCallback(() => {
    setIsTimeToShow(false);
    hasTriggeredRef.current = false;
  }, []);

  return {
    isTimeToShow,
    triggerManually,
    reset,
    hasShownToday: hasShownToday(),
  };
}
