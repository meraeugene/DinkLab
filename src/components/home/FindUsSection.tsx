import { ExternalLink, MapPin, Phone } from "lucide-react";

const mapQuery =
  "Dink Lab Pickleball Koronadal City South Cotabato Philippines";
const mapUrl =
  "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3964.283713993342!2d124.85185417448032!3d6.485710323602413!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x32f819001a0308ab%3A0xf813db30c47ed78e!2sDink%20Lab!5e0!3m2!1sen!2sph!4v1787018136935!5m2!1sen!2sph";
const directionsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQuery)}`;

export function FindUsSection() {
  return (
    <section id="find-us" className="court-section relative py-16">
      <div className="site-container">
        <div className="grid overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.035] lg:grid-cols-[0.86fr_1.14fr]">
          <div className="p-5 sm:p-8 lg:p-10">
            <p className="font-display text-sm font-black uppercase tracking-[0.35em] text-zinc-500">
              Find Us
            </p>
            <h2 className="font-display hero-shine-text mt-4 text-4xl font-black uppercase sm:text-6xl">
              Dink Lab
            </h2>
            <p className="mt-5 max-w-xl text-lg leading-8 text-zinc-300">
              Crossing Diaz, Brgy. Zone 3, Koronadal City, South Cotabato,
              Philippines
            </p>
            <div className="mt-8 grid gap-4">
              <a
                className="group flex items-center gap-4 rounded-2xl border border-white/10 bg-black/35 p-5 text-zinc-200 transition hover:border-white/35 hover:bg-white/[0.06]"
                href="tel:09171365161"
              >
                <span className="icon-chip h-11 w-11 rounded-xl">
                  <Phone className="h-5 w-5" />
                </span>
                <span>
                  <span className="block text-xs uppercase tracking-[0.2em] text-zinc-500">
                    Call
                  </span>
                  <span className="font-bold ">09171365161</span>
                </span>
              </a>
              <div className="flex items-center gap-4 rounded-2xl border border-white/10 bg-black/35 p-5 text-zinc-200">
                <span className="icon-chip h-11 w-11 rounded-xl">
                  <MapPin className="h-5 w-5" />
                </span>
                <span>
                  <span className="block text-xs uppercase tracking-[0.2em] text-zinc-500">
                    Hours
                  </span>
                  <span className="font-bold text-sm">
                    Open Daily from 8am-1am
                  </span>
                </span>
              </div>
              <a
                className="group flex items-center gap-4 rounded-2xl border border-white/10 bg-black/35 p-5 text-zinc-200 transition hover:border-white/35 hover:bg-white/[0.06]"
                href="https://www.facebook.com/profile.php?id=61590654984965"
                rel="noreferrer"
                target="_blank"
              >
                <span className="icon-chip h-11 w-11 rounded-xl font-black">
                  f
                </span>
                <span>
                  <span className="block text-xs uppercase tracking-[0.2em] text-zinc-500">
                    Facebook
                  </span>
                  <span className="font-bold">Dink Lab</span>
                </span>
              </a>
              <a
                className="premium-button h-14 rounded-xl px-5 font-display uppercase"
                href={directionsUrl}
                rel="noreferrer"
                target="_blank"
              >
                Open in Google Maps <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          </div>

          <div className="min-h-[22rem] overflow-hidden border-t border-white/10 bg-zinc-900 lg:min-h-[38rem] lg:border-l lg:border-t-0">
            <iframe
              allowFullScreen
              className="h-full min-h-[22rem] w-full lg:min-h-[38rem]"
              loading="lazy"
              referrerPolicy="strict-origin-when-cross-origin"
              src={mapUrl}
              title="Google Maps location for Dink Lab pickleball court"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
