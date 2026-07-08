import Image from "next/image";
import { Trophy } from "lucide-react";

const categories = ["Beginner", "Novice", "Intermediate"];

export function TournamentSection() {
  return (
    <section id="tournament" className="court-section relative py-16">
      <div className="site-container">
        <div className="grid items-stretch gap-6 lg:grid-cols-[0.92fr_1.08fr]">
          <div className="hidden md:block silver-border glass-panel relative overflow-hidden rounded-[2rem] p-3 sm:p-4">
            <Image
              className="h-auto w-full rounded-[1.45rem] object-contain shadow-[0_28px_90px_rgba(0,0,0,0.55)]"
              src="/tournament-flyer.jpg"
              alt="Cong. Dinand L. Hernandez Mini Pickleball Tournament flyer"
              width={896}
              height={1152}
            />
          </div>

          <article className="tournament-copy-panel flex flex-col justify-between sm:p-8 lg:p-10">
            <div>
              <div className="inline-flex items-center  gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-bold uppercase tracking-[0.24em] text-zinc-300">
                <Trophy className="h-3.5 w-3.5" />
                Opening Mini Tournament
              </div>
              <h2 className="font-display hero-shine-text mt-6 text-3xl font-black uppercase leading-tight sm:text-5xl">
                Cong. Dinand L. Hernandez Mini Pickleball Tournament
              </h2>
              <p className="mt-5 max-w-2xl  md:text-lg leading-8 text-zinc-400">
                The first Dink Lab tournament opens the courts with three
                competitive brackets, cash prizes, and a full day of community
                play.
              </p>
              <div className="mt-7 grid gap-3 sm:grid-cols-3">
                {categories.map((category) => (
                  <div
                    key={category}
                    className="rounded-2xl border border-white/10 bg-black/45 p-4 transition hover:border-white/30 hover:bg-white/[0.06]"
                  >
                    <p className="font-display text-lg font-black uppercase text-white">
                      {category}
                    </p>
                    <p className="mt-2 text-sm uppercase tracking-[0.18em] text-zinc-500">
                      Cash prizes
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-8 flex flex-col gap-3 border-t border-white/10 pt-6 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-display text-3xl font-black text-white">
                  July 25, 2026
                </p>
                <p className="mt-1 text-sm text-zinc-500">
                  Secure your slots now
                </p>
              </div>
              {/* <a
                className="premium-button font-display hidden h-14 rounded-xl px-6 text-xs mt-2 font-black uppercase tracking-[0.32em] text-white/90"
                href="#schedule"
              >
                Book Tournament Slot <ArrowRight className="h-4 w-4" />
              </a> */}
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}
