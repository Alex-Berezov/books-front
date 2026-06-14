import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://bibliaris.com';

  return {
    rules: {
      userAgent: '*',
      allow: [
        '/',
        '/*/catalog',
        '/*/catalog/*',
        '/*/genres',
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
    sitemap: `${baseUrl.replace(/\/$/, '')}/sitemap.xml`,
  };
}
