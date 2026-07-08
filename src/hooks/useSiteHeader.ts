"use client";

import { useEffect, useState } from "react";
import { siteNavItems } from "@/data/navigation/siteNavItems";

export function useSiteHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState(siteNavItems[0].href);

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 28);
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const elements = siteNavItems
      .map((item) => document.querySelector(item.href))
      .filter((element): element is Element => Boolean(element));

    if (!elements.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

        if (visible?.target.id) {
          setActiveSection(`#${visible.target.id}`);
        }
      },
      {
        rootMargin: "-35% 0px -55% 0px",
        threshold: [0.08, 0.18, 0.32, 0.5],
      },
    );

    elements.forEach((element) => observer.observe(element));

    return () => observer.disconnect();
  }, []);

  return {
    activeSection,
    scrolled,
    setActiveSection,
  };
}
