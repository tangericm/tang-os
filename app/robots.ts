import type { MetadataRoute } from "next";

/**
 * robots.txt via Next's file convention (served at /robots.txt).
 *
 * Policy: search engines welcome (recruiters DO google you — SEO is
 * a feature), but AI-training and bulk-scraping crawlers are asked to
 * leave. Note this is etiquette, not enforcement: polite bots honor
 * it, rude ones don't — enforcement lives in Vercel's bot firewall.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: [
          "GPTBot",
          "CCBot",
          "ClaudeBot",
          "Claude-Web",
          "Google-Extended",
          "Applebot-Extended",
          "Bytespider",
          "meta-externalagent",
          "PerplexityBot",
          "Amazonbot",
        ],
        disallow: "/",
      },
      { userAgent: "*", allow: "/" },
    ],
  };
}
