"use client";

import { useSplashScreen } from "@/hooks/useSplashScreen";
import { SplashFrame } from "./SplashFrame";

export function SplashScreen() {
  const { splashRef, visible } = useSplashScreen();

  if (!visible) return null;

  return (
    <SplashFrame
      autoExit
      className="fixed inset-0 z-[100] overflow-hidden"
      rootRef={splashRef}
    />
  );
}
