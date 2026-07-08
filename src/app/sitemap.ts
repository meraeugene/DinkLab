import type { MetadataRoute } from "next";
import { getAppUrl } from "@/utils/env/appEnv";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: getAppUrl(),
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
  ];
}
