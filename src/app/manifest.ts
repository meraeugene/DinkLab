import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Dink Lab Pickleball Court Booking",
    short_name: "Dink Lab",
    description:
      "Book roofed pickleball courts at Dink Lab in Koronadal City.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#000000",
    theme_color: "#000000",
    icons: [
      {
        src: "/dink-lab-logo.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/test.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
