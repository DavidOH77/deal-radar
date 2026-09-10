import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site-url";

export default function robots(): MetadataRoute.Robots {
  const origin = siteUrl().origin;
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/deals/"],
      disallow: ["/admin/", "/api/", "/go/", "/original/", "/saved", "/notifications", "/status"]
    },
    sitemap: `${origin}/sitemap.xml`
  };
}
