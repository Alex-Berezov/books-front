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
        // 🔴 `LEGACY-175`. Живые читалка и плеер лежат по
        // `/{lang}/book/{slug}/read|listen`, а не по `/{lang}/read|listen`, и
        // под `/*/read/*` не подходят: тому шаблону нужна подстрока `/read/`.
        // Разрешающее `/*/book/*` выше приглашало краулер на адрес, который с
        // 15.08.2026 отвечает редиректом на вход, — `noindex, follow` со
        // страницы до краулера больше не доезжает. Запрет длиннее разрешения,
        // поэтому по правилу «побеждает самое конкретное» он и действует.
        '/*/book/*/read',
        '/*/book/*/read/*',
        '/*/book/*/listen',
        '/*/book/*/listen/*',
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
