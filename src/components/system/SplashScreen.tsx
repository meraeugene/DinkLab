"use client";

import { useSplashScreen } from "@/hooks/useSplashScreen";
import { SplashFrame } from "./SplashFrame";

export function SplashScreen() {
  const { exiting, visible } = useSplashScreen();

  if (!visible) return null;

  return (
    <SplashFrame
      className="fixed inset-0 z-[100] overflow-hidden"
      exiting={exiting}
    />
  );
}
