import type { MetadataRoute } from 'next';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://soptrackr.com';

// Generates /sitemap.xml listing the public marketing pages so Google can
// discover them. Private/authenticated routes are intentionally excluded.
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const routes: Array<{
    path: string;
    priority: number;
    changeFrequency: 'weekly' | 'monthly' | 'yearly';
  }> = [
    { path: '',         priority: 1.0, changeFrequency: 'weekly' },
    { path: '/pricing', priority: 0.9, changeFrequency: 'monthly' },
    { path: '/about',   priority: 0.7, changeFrequency: 'monthly' },
    { path: '/demo',    priority: 0.7, changeFrequency: 'monthly' },
    { path: '/contact', priority: 0.6, changeFrequency: 'monthly' },
    { path: '/privacy', priority: 0.3, changeFrequency: 'yearly' },
    { path: '/terms',   priority: 0.3, changeFrequency: 'yearly' },
  ];

  return routes.map((r) => ({
    url: `${siteUrl}${r.path}`,
    lastModified: now,
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }));
}
