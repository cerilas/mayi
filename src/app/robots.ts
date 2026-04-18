import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const siteUrl = process.env.NEXTAUTH_URL || "https://myfizyopilates.com";

  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/share/", "/login"],
        disallow: ["/chat", "/api/", "/settings", "/admin"],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
