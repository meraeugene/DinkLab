"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { AuthButton } from "@/components/auth-button";

type SiteHeaderProps = {
  avatarUrl?: string | null;
  email?: string | null;
  fullName?: string | null;
  isAdmin?: boolean;
};

export function SiteHeader({
  avatarUrl,
  email,
  fullName,
  isAdmin = false,
}: SiteHeaderProps) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 28);
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={[
        "fixed inset-x-0 top-0 z-40 border-b transition-all duration-300",
        scrolled
          ? "border-white/10 bg-black/45 shadow-[0_18px_70px_rgba(0,0,0,0.32)] sm:backdrop-blur-xl"
          : "border-transparent bg-transparent",
      ].join(" ")}
    >
      <div className="site-container">
        <div className="flex min-h-14 items-center justify-between gap-3  sm:min-h-16">
          <Link className="group flex min-w-0 items-center gap-3" href="/">
            {/* <span className="relative h-18 w-18 shrink-0 overflow-hidden  sm:h-11 sm:w-11">
              <Image
                alt="Dink Lab"
                className="object-cover"
                fill
                priority
                sizes="44px"
                src="/test.png"
              />
            </span> */}
            <span className="font-display text-xs font-black uppercase tracking-[0.24em] text-white/90 sm:block">
              Dink Lab
            </span>
          </Link>

          <AuthButton
            avatarUrl={avatarUrl}
            email={email}
            fullName={fullName}
            isAdmin={isAdmin}
          />
        </div>
      </div>
    </header>
  );
}
