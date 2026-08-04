import { buildPublicUrl } from '@/lib/seo/urls';
import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: [
        '/',
        '/*/catalog',
        '/*/audiobooks',
        '/*/popular-books',
        '/*/new-releases',
        '/*/categories',
        '/*/category/*',
        '/*/genres',
        '/*/genre/*',
        '/*/collections',
        '/*/collection/*',
        '/*/tags',
        '/*/tag/*',
        '/*/book/*',
        '/*/author/*',
        '/*/privacy',
        '/*/terms',
        '/*/deletion',
      ],
      disallow: [
        '/*/auth/',
        '/*/auth/*',
        '/*/profile',
        '/*/bookshelf',
        '/*/read/',
        '/*/read/*',
        '/*/listen/',
        '/*/listen/*',
        '/*/summary/',
        '/*/summary/*',
        '/admin/',
        '/admin/*',
        '/api/',
        '/api/*',
      ],
    },
    sitemap: buildPublicUrl('/sitemap.xml'),
  };
}
