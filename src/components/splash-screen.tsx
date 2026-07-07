"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

export function SplashScreen() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setShow(true));
    const timer = window.setTimeout(() => setShow(false), 2250);

    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timer);
    };
  }, []);

  if (!show) return null;

  return (
    <div className="splash-screen fixed inset-0 z-[100] grid place-items-center bg-black">
      <div className="absolute inset-0 ambient-grid opacity-35" />
      <div className="absolute left-1/2 top-1/2 h-[42rem] w-[42rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/10 blur-[120px]" />
      <div className="splash-logo relative flex w-full max-w-4xl flex-col items-center px-8">
        <Image
          className="h-auto w-full max-w-2xl drop-shadow-[0_0_55px_rgba(255,255,255,0.28)]"
          src="/dink-lab-reference.jpg"
          alt="Dink Lab"
          width={1280}
          height={1280}
          priority
        />
        <div className="mt-4 h-px w-64 bg-gradient-to-r from-transparent via-white/70 to-transparent" />
        <p className="font-display mt-5 text-xs font-bold uppercase tracking-[0.55em] text-zinc-400">
          Court Laboratory Loading
        </p>
      </div>
    </div>
  );
}
