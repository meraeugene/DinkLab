"use client";

import { useEffect, useState } from "react";

const INTRO_DURATION_MS = 1650;
const EXIT_DURATION_MS = 360;
const REDUCED_MOTION_DURATION_MS = 80;

export function useSplashScreen() {
  const [visible, setVisible] = useState(true);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const introDuration = prefersReducedMotion
      ? REDUCED_MOTION_DURATION_MS
      : INTRO_DURATION_MS;
    const exitDuration = prefersReducedMotion
      ? REDUCED_MOTION_DURATION_MS
      : EXIT_DURATION_MS;

    function restoreBodyScroll() {
      document.body.style.overflow = previousOverflow;
    }

    document.body.style.overflow = "hidden";

    const exitTimeout = window.setTimeout(() => setExiting(true), introDuration);
    const unmountTimeout = window.setTimeout(() => {
      restoreBodyScroll();
      setVisible(false);
    }, introDuration + exitDuration);

    return () => {
      window.clearTimeout(exitTimeout);
      window.clearTimeout(unmountTimeout);
      restoreBodyScroll();
    };
  }, []);

  return { exiting, visible };
}
