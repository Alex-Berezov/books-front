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
        // ⚠️ Запретов на читалку, плеер и саммари здесь больше нет намеренно.
        // С 22.08.2026 эти страницы открыты анониму, а из индекса их держит
        // `robots: 'noindex, follow'` в самих `page.tsx`. Именно поэтому
        // краулер обязан до них доходить: запрет в `robots.txt` не даёт
        // прочитать метатег, и адрес, на который есть ссылки с публичных
        // страниц книги, попадает в выдачу без заголовка и описания. Закрывать
        // от индексации надо в одном месте из двух, и это метатег.
        '/admin/',
        '/admin/*',
        '/api/',
        '/api/*',
      ],
    },
    sitemap: buildPublicUrl('/sitemap.xml'),
  };
}
