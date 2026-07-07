/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useState } from "react";

export function SplashScreen() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timeout = window.setTimeout(() => setVisible(false), 1900);
    return () => window.clearTimeout(timeout);
  }, []);

  if (!visible) return null;

  return (
    <div className="splash-screen fixed inset-0 z-[100] grid place-items-center bg-black px-8">
      <div className="grid w-full  gap-7 ">
        <div className="relative">
          <img
            alt="Dink Lab"
            className="h-auto w-full"
            src="/test.png"
            width={1178}
          />
        </div>
        <div className="mx-auto w-full max-w-xs">
          <div className="h-px overflow-hidden rounded-full bg-white/12">
            <div className="splash-loading-line h-full rounded-full bg-white" />
          </div>
          <p className="mt-3 text-center font-display text-[0.65rem] font-black uppercase tracking-[0.32em] text-zinc-500">
            Loading court
          </p>
        </div>
      </div>
    </div>
  );
}
