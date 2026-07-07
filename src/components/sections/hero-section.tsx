import { ArrowRight, MapPin, Trophy } from "lucide-react";
import Image from "next/image";

export function HeroSection() {
  return (
    <section className="relative min-h-screen overflow-hidden">
      <div className="absolute inset-0">
        <Image
          alt="Dink Lab black pickleball court"
          className="object-cover object-center"
          fill
          priority
          sizes="100vw"
          src="/dink-lab-court-hero.png"
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_58%,rgba(255,255,255,0.12),transparent_24%),linear-gradient(90deg,rgba(0,0,0,0.76),rgba(0,0,0,0.34),rgba(0,0,0,0.76)),linear-gradient(180deg,rgba(0,0,0,0.52),rgba(0,0,0,0.18)_42%,#000_100%)]" />
      </div>

      <div className="site-container relative flex min-h-screen items-center justify-center pb-20 pt-28 text-center">
        <div className="reveal-up mx-auto max-w-5xl">
          <div className="mx-auto font-display inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/25 px-4 py-2 text-xs font-bold uppercase tracking-[0.28em] text-zinc-200 backdrop-blur-md">
            <MapPin className="h-3.5 w-3.5" />
            Koronadal Pickleball
          </div>

          <h1 className="font-display hero-shine-text mx-auto mt-6 max-w-5xl text-5xl font-black uppercase leading-[0.88] tracking-tight sm:text-7xl lg:text-8xl xl:text-9xl">
            Play inside the lab.
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-base leading-8 text-zinc-200 sm:text-xl ">
            Professional roofed courts, sharp lighting, and a black-silver arena
            built for premium rallies from morning to midnight.
          </p>

          <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
            <a
              className="premium-button hidden h-14 rounded-xl px-7 font-display text-xs font-black uppercase tracking-[0.32em] text-white/90"
              href="#schedule"
            >
              BOOK HERE <ArrowRight className="h-4 w-4" />
            </a>
            <a
              className="premium-button-dark hidden h-14 rounded-xl px-7 font-display text-xs font-black uppercase tracking-[0.32em] text-white/90"
              href="#tournament"
            >
              <Trophy className="h-4 w-4" /> View tournament
            </a>
          </div>

          <div className="mx-auto mt-12 grid max-w-3xl gap-3 sm:grid-cols-3">
            {[
              ["2", "Pro Courts"],
              ["8am-1am", "Open Daily"],
              ["PHP 150", "Early Bird"],
            ].map(([value, label]) => (
              <div
                key={label}
                className="shine-card rounded-2xl border border-white/10 bg-black/35 p-4 backdrop-blur-md transition hover:bg-black/45"
              >
                <p className="font-display text-2xl font-black text-white">
                  {value}
                </p>
                <p className="mt-1 text-xs font-bold uppercase tracking-[0.2em] text-zinc-400">
                  {label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
