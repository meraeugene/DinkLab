import Image from "next/image";

const announcements = [
  {
    image: "/early-bird-promo.jpg",
    alt: "Dink Lab Early Bird Promo flyer",
    title: "Early Bird Promo",
  },
  {
    image: "/tournament-flyer.jpg",
    alt: "Cong. Dinand L. Hernandez Mini Pickleball Tournament flyer",
    title: "Cong. Dinand L. Hernandez Mini Pickleball Tournament",
  },
];

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

        <div className="grid gap-6 md:grid-cols-2">
          {announcements.map((announcement) => (
            <div
              className="silver-border glass-panel relative overflow-hidden rounded-[2rem] p-3 sm:p-4"
              key={announcement.title}
            >
              <Image
                className="h-auto w-full rounded-[1.45rem] object-contain shadow-[0_28px_90px_rgba(0,0,0,0.55)]"
                src={announcement.image}
                alt={announcement.alt}
                width={896}
                height={1152}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
