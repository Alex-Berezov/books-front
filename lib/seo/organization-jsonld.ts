import { buildLangUrl, buildPublicUrl } from '@/lib/seo/urls';
import { contactGeneral } from '@/lib/site/owner-contacts';

const SITE_NAME = 'Bibliaris';

// Логотип - существующий значок сайта (`public/favicon.png`), отдельного файла логотипа в проекте нет.
const LOGO_PATH = '/favicon.png';

// Постоянные `@id`: разметка повторяется на главной каждого языка и на `/about`, по ним поисковик
// сводит узлы. Узел сайта - тот же, что бэкенд отдаёт на страницах книг и таксономий
// (`generateWebSiteSchema` в `books`, на него ссылаются их `isPartOf`): `@id` `<site>/#website`, адрес - корень.
const organizationId = () => buildPublicUrl('/#organization');
const webSiteId = () => buildPublicUrl('/#website');

/** Организация. `sameAs` не выводится: ссылок на официальные страницы проекта владелец не дал. */
export function buildOrganizationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': organizationId(),
    name: SITE_NAME,
    url: buildPublicUrl('/'),
    logo: buildPublicUrl(LOGO_PATH),
    email: contactGeneral,
  };
}

/** Сайт. Поиск с адресом-шаблоном - каталог (`/{lang}/catalog?q=`), как в `WebSite` бэкенда. */
export function buildWebSiteJsonLd(lang: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': webSiteId(),
    name: SITE_NAME,
    url: buildPublicUrl('/'),
    publisher: { '@id': organizationId() },
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${buildLangUrl(lang, '/catalog')}?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };
}
