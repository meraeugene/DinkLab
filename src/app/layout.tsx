import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Orbitron } from "next/font/google";
import { ServiceWorkerRegister } from "@/components/system/ServiceWorkerRegister";
import { getAppUrl } from "@/utils/env/appEnv";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const orbitron = Orbitron({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  metadataBase: new URL(getAppUrl()),
  title: {
    default: "Dink Lab | Pickleball Court Booking in Koronadal City",
    template: "%s | Dink Lab",
  },
  description:
    "Book premium roofed pickleball courts at Dink Lab in Koronadal City. Choose a court, select an available schedule, and submit your payment proof online.",
  applicationName: "Dink Lab",
  alternates: {
    canonical: "/",
  },
  keywords: [
    "Dink Lab",
    "pickleball Koronadal",
    "pickleball court booking",
    "Koronadal sports",
    "roofed pickleball court",
  ],
  manifest: "/manifest.webmanifest",
  openGraph: {
    title: "Dink Lab | Pickleball Court Booking",
    description:
      "Book premium roofed pickleball courts at Dink Lab in Koronadal City.",
    url: "/",
    siteName: "Dink Lab",
    images: [
      {
        url: "/thumbnail.png",
        width: 1920,
        height: 945,
        alt: "Dink Lab pickleball court",
      },
    ],
    locale: "en_PH",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Dink Lab | Pickleball Court Booking",
    description:
      "Book premium roofed pickleball courts at Dink Lab in Koronadal City.",
    images: ["/thumbnail.png"],
  },
};

export const viewport: Viewport = {
  themeColor: "#000000",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${orbitron.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-black text-white">
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
