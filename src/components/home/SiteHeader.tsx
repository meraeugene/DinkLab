"use client";

import Link from "next/link";
import { siteNavItems } from "@/data/navigation/siteNavItems";
import { useSiteHeader } from "@/hooks/useSiteHeader";
import type { UserBooking } from "@/types/userBooking";
import { AuthButton } from "@/components/auth/AuthButton";

type SiteHeaderProps = {
  avatarUrl?: string | null;
  email?: string | null;
  fullName?: string | null;
  isAdmin?: boolean;
  bookings?: UserBooking[];
};

export function SiteHeader({
  avatarUrl,
  email,
  fullName,
  isAdmin = false,
  bookings = [],
}: SiteHeaderProps) {
  const { activeSection, scrolled, setActiveSection } = useSiteHeader();

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

          <nav
            aria-label="Main sections"
            className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-1 rounded-full border border-white/10 bg-black/30 p-1 backdrop-blur-xl lg:flex"
          >
            {siteNavItems.map((item) => (
              <a
                className={[
                  "rounded-full px-4 py-2 font-display text-[0.65rem] font-black uppercase tracking-[0.18em] transition",
                  activeSection === item.href
                    ? "bg-white/[0.14] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]"
                    : "text-zinc-400 hover:bg-white/[0.08] hover:text-white",
                ].join(" ")}
                href={item.href}
                key={item.href}
                onClick={() => setActiveSection(item.href)}
              >
                {item.label}
              </a>
            ))}
          </nav>

          <AuthButton
            avatarUrl={avatarUrl}
            bookings={bookings}
            email={email}
            fullName={fullName}
            isAdmin={isAdmin}
          />
        </div>
      </div>
    </header>
  );
}
