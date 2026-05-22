import type { MetadataRoute } from 'next';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://soptrackr.com';

// Generates /robots.txt. Public marketing pages are crawlable; the
// authenticated app, super-admin, and API routes are not. sign-in/sign-up are
// left crawlable on purpose so Google can see (and honor) their noindex meta.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/app', '/admin', '/api/'],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
