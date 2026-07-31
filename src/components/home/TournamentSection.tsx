import { Megaphone } from "lucide-react";

export function TournamentSection() {
  return (
    <section id="announcements" className="court-section relative py-16">
      <div className="site-container">
        <div className="mb-8">
          <p className="font-display text-sm font-black uppercase tracking-[0.35em] text-zinc-500">
            Latest Updates
          </p>
          <h2 className="font-display hero-shine-text mt-3 text-3xl font-black uppercase leading-tight sm:text-6xl">
            Announcements
          </h2>
        </div>

        <div className="silver-border glass-panel grid min-h-72 place-items-center rounded-[2rem] px-6 py-12 text-center sm:min-h-96">
          <div className="max-w-md">
            <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-white/10 bg-white/[0.05] text-zinc-300">
              <Megaphone className="h-6 w-6" />
            </span>
            <h3 className="font-display mt-6 text-xl font-black uppercase tracking-[0.12em] text-white sm:text-2xl">
              No announcements yet
            </h3>
            <p className="mt-3 text-sm leading-6 text-zinc-500">
              Check back soon for upcoming events, promos, and Dink Lab updates.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
