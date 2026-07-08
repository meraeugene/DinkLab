import type { MetadataRoute } from "next";
import { getAppUrl } from "@/utils/env/appEnv";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/api", "/auth"],
      },
    ],
    sitemap: `${getAppUrl()}/sitemap.xml`,
  };
}
