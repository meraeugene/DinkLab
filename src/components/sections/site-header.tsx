"use client";

import { Menu, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { AuthButton } from "@/components/auth-button";

type SiteHeaderProps = {
  email?: string | null;
  fullName?: string | null;
};

const menuItems = [
  ["Tournament", "#tournament"],
  ["Book a Slot", "#schedule"],
  ["Find Us", "#find-us"],
];

export function SiteHeader({ email, fullName }: SiteHeaderProps) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 28);
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";

    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  return (
    <>
      <header
        className={[
          "fixed inset-x-0 top-0 z-40 border-b transition-all duration-300",
          scrolled
            ? "border-white/10 bg-black/30 shadow-[0_18px_70px_rgba(0,0,0,0.35)] backdrop-blur-2xl"
            : "border-transparent bg-transparent backdrop-blur-0",
        ].join(" ")}
      >
        <div className="site-container">
          <div className="flex min-h-14 items-center justify-between gap-3 py-2 md:min-h-20 md:py-3">
            <Link
              className="group flex min-w-0 items-center gap-3"
              href="/"
              onClick={() => setMenuOpen(false)}
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full border border-white/15 bg-black/30 backdrop-blur-md md:h-11 md:w-11">
                <Image
                  src="/dink-lab-reference.jpg"
                  alt="Dink Lab"
                  width={48}
                  height={48}
                  priority
                />
              </span>
              <span className="font-display  text-xs font-black uppercase tracking-[0.32em] text-white/90 sm:block">
                Dink Lab
              </span>
            </Link>

            <nav className="hidden items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-white/62 md:flex">
              {menuItems.map(([label, href]) => (
                <a
                  key={label}
                  className="font-display rounded-xl px-4 py-2 text-xs font-black uppercase tracking-[0.32em] transition hover:bg-white/[0.07] hover:text-white"
                  href={href}
                >
                  {label}
                </a>
              ))}
            </nav>

            <div className="flex items-center gap-3">
              <div className="hidden md:block">
                <AuthButton
                  email={email}
                  fullName={fullName}
                  variant="compact"
                />
              </div>
              <button
                aria-expanded={menuOpen}
                aria-label="Open menu"
                className="menu-icon-button shrink-0"
                type="button"
                onClick={() => setMenuOpen(true)}
              >
                <Menu className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <div
        className={[
          "fixed inset-0 z-50 bg-black/92 backdrop-blur-2xl transition duration-300 ease-out",
          menuOpen
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none scale-[0.99] opacity-0",
        ].join(" ")}
      >
        <div
          className={[
            "site-container flex min-h-screen flex-col py-3 md:py-5",
            menuOpen ? "menu-panel-enter" : "",
          ].join(" ")}
        >
          <div
            className={[
              "flex items-center justify-between gap-3",
              menuOpen ? "menu-item-enter [animation-delay:80ms]" : "",
            ].join(" ")}
          >
            <Link
              className="group flex min-w-0 items-center gap-3"
              href="/"
              onClick={() => setMenuOpen(false)}
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full border border-white/15 bg-black/30 backdrop-blur-md md:h-11 md:w-11">
                <Image
                  src="/dink-lab-reference.jpg"
                  alt="Dink Lab"
                  width={48}
                  height={48}
                  priority
                />
              </span>
              <span className="font-display text-xs font-black uppercase tracking-[0.32em] text-white/90">
                Dink Lab
              </span>
            </Link>
            <button
              aria-label="Close menu"
              className="menu-icon-button shrink-0"
              type="button"
              onClick={() => setMenuOpen(false)}
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex flex-1 flex-col justify-center gap-10 py-12">
            <nav className="grid">
              {menuItems.map(([label, href]) => (
                <a
                  key={label}
                  className={[
                    "font-display hero-shine-text court-line border-b-4 py-5 text-4xl font-black uppercase leading-none sm:text-6xl",
                    menuOpen ? "menu-item-enter" : "",
                  ].join(" ")}
                  href={href}
                  onClick={() => setMenuOpen(false)}
                  style={{
                    animationDelay: `${160 + menuItems.findIndex(([item]) => item === label) * 80}ms`,
                  }}
                >
                  {label}
                </a>
              ))}
            </nav>

            <div
              className={[
                " grid gap-4 ",
                menuOpen ? "menu-item-enter [animation-delay:420ms]" : "",
              ].join(" ")}
            >
              <p className="font-display text-xs font-black uppercase tracking-[0.32em] text-zinc-500">
                Player Access
              </p>
              <div className="max-w-sm">
                <AuthButton email={email} fullName={fullName} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
