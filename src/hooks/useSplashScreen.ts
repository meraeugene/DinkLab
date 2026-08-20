"use client";

import { useEffect, useRef, useState } from "react";

const FALLBACK_DURATION_MS = 2400;

export function useSplashScreen() {
  const [visible, setVisible] = useState(true);
  const splashRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const splash = splashRef.current;
    let finished = false;

    function restoreBodyScroll() {
      document.body.style.overflow = previousOverflow;
    }

    function finishSplash() {
      if (finished) return;
      finished = true;
      restoreBodyScroll();
      setVisible(false);
    }

    function handleAnimationEnd(event: AnimationEvent) {
      if (event.target === splash && event.animationName === "splash-out") {
        finishSplash();
      }
    }

    document.body.style.overflow = "hidden";

    if (!splash || getComputedStyle(splash).visibility === "hidden") {
      finishSplash();
      return restoreBodyScroll;
    }

    splash.addEventListener("animationend", handleAnimationEnd);
    const fallbackTimeout = window.setTimeout(
      finishSplash,
      FALLBACK_DURATION_MS,
    );

    return () => {
      splash.removeEventListener("animationend", handleAnimationEnd);
      window.clearTimeout(fallbackTimeout);
      restoreBodyScroll();
    };
  }, []);

  return { splashRef, visible };
}
