"use client";

/* eslint-disable @next/next/no-img-element */

import { useEffect, useState } from "react";

const LOADING_DURATION_MS = 1650;
const REDUCED_MOTION_DURATION_MS = 80;

export function SplashFrame({
  className = "",
  exiting = false,
}: {
  className?: string;
  exiting?: boolean;
}) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const startedAt = performance.now();
    const loadingDuration = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches
      ? REDUCED_MOTION_DURATION_MS
      : LOADING_DURATION_MS;
    let animationFrame = 0;

    function updateProgress(now: number) {
      const nextProgress = Math.min(
        100,
        Math.floor(((now - startedAt) / loadingDuration) * 100),
      );
      setProgress(nextProgress);

      if (nextProgress < 100) {
        animationFrame = window.requestAnimationFrame(updateProgress);
      }
    }

    animationFrame = window.requestAnimationFrame(updateProgress);
    return () => window.cancelAnimationFrame(animationFrame);
  }, []);

  return (
    <div
      className={[
        "relative grid h-dvh max-h-dvh w-screen max-w-full place-items-center overflow-hidden bg-black px-8",
        exiting ? "splash-screen-exit" : "",
        className,
      ].join(" ")}
    >
      <div className="splash-content grid w-full max-w-5xl gap-7">
        <span className=" mx-auto block w-[60%] lg:w-[30%]">
          <img
            alt="Dink Lab"
            className="splash-logo h-auto w-full"
            src="/test.png"
          />
        </span>
        <div className="mx-auto w-full max-w-xs">
          <div className="h-[3px]  overflow-hidden rounded-full bg-white/12">
            <div
              className="splash-loading-line h-full rounded-full bg-white"
              style={{ transform: `scaleX(${progress / 100})` }}
            />
          </div>
          <p className="mt-3 text-center font-display text-[0.65rem] font-black uppercase tracking-[0.32em] text-zinc-500">
            <span
              aria-label={`Loading ${progress}%`}
              className="splash-loading-text inline-block whitespace-nowrap tabular-nums md:text-lg"
            >
              {progress}%
            </span>
          </p>
        </div>
      </div>
      <p className="absolute bottom-[max(1.5rem,env(safe-area-inset-bottom))] left-0 w-full px-6 text-center text-xs font-medium text-zinc-600">
        Developed by{" "}
        <a
          className="text-zinc-400 underline decoration-zinc-500 underline-offset-4 transition hover:text-white hover:decoration-white"
          href="https://andrewvillalon.online"
          rel="noreferrer"
          target="_blank"
        >
          Andrew Villalon
        </a>
      </p>
    </div>
  );
}
