import Image from "next/image";
import { PanelsTopLeft, ShieldCheck } from "lucide-react";

const amenities = [
  {
    title: "2 Pro Courts",
    body: "Black courts, pro lights, pro spacing.",
    image: "/amenity-court.png",
    icon: ShieldCheck,
  },
  {
    title: "Roofed Courts",
    body: "Covered play in any weather.",
    image: "/amenity-roof.png",
    icon: PanelsTopLeft,
  },
  {
    title: "Rhamzas × DinkLab",
    body: "We play, they fuel.",
    image: "/rhamzas-dinklab.jpg",
    imageClassName: "object-cover",
  },
];

export function AmenitiesSection() {
  return (
    <section id="amenities" className="court-section relative py-16">
      <div className="site-container">
        <div className="mb-8 grid gap-4 md:grid-cols-[3fr_1.1fr] lg:md:grid-cols-[1fr_1.1fr] md:items-end">
          <div>
            {/* <p className="font-display text-sm font-black uppercase tracking-[0.35em] text-zinc-500">
              Dink Lab Amenities
            </p> */}
            <h2 className="font-display hero-shine-text mt-3 text-4xl font-black uppercase leading-tight sm:text-5xl">
              Dink Lab Amenities
            </h2>
          </div>
          {/* <p className="max-w-2xl leading-6 text-zinc-400 md:justify-self-end ">
            Everything is built around the court.
          </p> */}
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          {amenities.map((amenity) => (
            <article
              className="silver-border glass-panel group overflow-hidden rounded-2xl"
              key={amenity.title}
            >
              <div className="relative aspect-square overflow-hidden bg-black/55 p-5 sm:p-6">
                <Image
                  alt={amenity.title}
                  className={`${amenity.imageClassName || "object-contain"} object-center opacity-95 drop-shadow-[0_0_42px_rgba(255,255,255,0.16)]`}
                  fill
                  sizes="(min-width: 768px) 33vw, 100vw"
                  src={amenity.image}
                />
                <div className="absolute inset-x-6 bottom-0 h-px bg-gradient-to-r from-transparent via-white/45 to-transparent" />
              </div>

              <div className="p-5">
                <h3 className="font-display text-xl font-black uppercase text-white">
                  {amenity.title}
                </h3>
                <p className="mt-3 text-sm leading-6 text-zinc-400">
                  {amenity.body}
                </p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
