import { render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { buildLangUrl } from '@/lib/seo/urls';
import { ApiError } from '@/types/api';

/**
 * Страница пересказа `/{lang}/book/{slug}/summary` (решение владельца 17.10.2026): серверный
 * рендер и индексация, версия - языка страницы, hreflang - только языки с пересказом, разбор
 * и анализ (`analysis`, `themes`) на странице не выводятся.
 */

const mocks = vi.hoisted(() => ({
  notFound: vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND');
  }),
  permanentRedirect: vi.fn(() => {
    throw new Error('NEXT_PERMANENT_REDIRECT');
  }),
  redirect: vi.fn(() => {
    throw new Error('NEXT_REDIRECT');
  }),
  pathname: '/en/book/hamlet/summary',
  getBookOverview: vi.fn(),
  getPublicBookSummary: vi.fn(),
  resolveSeo: vi.fn(),
  resolveRetiredSlug: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  notFound: mocks.notFound,
  permanentRedirect: mocks.permanentRedirect,
  redirect: mocks.redirect,
  usePathname: () => mocks.pathname,
  useRouter: () => ({ back: vi.fn(), replace: vi.fn(), push: vi.fn() }),
}));

vi.mock('@/api/endpoints/public', async () => {
  const actual =
    await vi.importActual<typeof import('@/api/endpoints/public')>('@/api/endpoints/public');
  return {
    ...actual,
    getBookOverview: mocks.getBookOverview,
    getPublicBookSummary: mocks.getPublicBookSummary,
    resolveSeo: mocks.resolveSeo,
  };
});

vi.mock('@/lib/seo/retired-slug', () => ({
  resolveRetiredSlug: mocks.resolveRetiredSlug,
}));

// Блоки «того же автора» и «похожие пересказы» - отдельный асинхронный компонент со своим запросом,
// его поведение посажено в `relatedBooksSummary.test.tsx`.
vi.mock('@/app/[lang]/book/[slug]/RelatedBooksSection', () => ({
  RelatedBooksSection: () => null,
}));

const UPDATED_AT = '2026-10-12T10:00:00.000Z';

const version = (language: string, slug: string, summaries: number, extra = {}) => ({
  id: `v-${language}`,
  type: 'text',
  language,
  slug,
  title: language === 'ru' ? 'Гамлет' : 'Hamlet',
  author: 'William Shakespeare',
  isFree: true,
  translators: [],
  _count: { chapters: 3, audioChapters: 0, summaries },
  ...extra,
});

const makeBook = (over: Record<string, unknown> = {}) => ({
  id: 'b1',
  slug: 'hamlet',
  title: 'Hamlet',
  author: 'William Shakespeare',
  authorSlug: 'william-shakespeare',
  firstPublishedYear: 1603,
  primaryCategory: { name: 'Drama' },
  versionIds: { text: 'v-en', audio: null },
  versions: [
    version('en', 'hamlet', 1, {
      characters: [{ name: 'Hamlet' }],
      faq: [{ question: 'Who dies?', answer: 'Almost everyone.' }],
    }),
    version('fr', 'hamlet-fr', 1),
    version('ru', 'gamlet', 0),
  ],
  ...over,
});

const SUMMARY = {
  id: 's1',
  summary:
    '<h2>Act I</h2><p>The ghost appears to Hamlet.</p><h2>Act II</h2><p>Hamlet feigns madness.</p>',
  analysis: '<p>ANALYSIS-TEXT</p>',
  themes: '<p>THEMES-TEXT</p>',
  updatedAt: UPDATED_AT,
};

const loadPage = () => import('@/app/[lang]/book/[slug]/summary/page');

const renderPage = async (lang = 'en', slug = 'hamlet') => {
  const { default: Page } = await loadPage();
  const el = await Page({ params: Promise.resolve({ lang, slug }) });
  return render(el);
};

const metadataFor = async (lang = 'en', slug = 'hamlet') => {
  const { generateMetadata } = await loadPage();
  return generateMetadata({ params: Promise.resolve({ lang, slug }) });
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.notFound.mockImplementation(() => {
    throw new Error('NEXT_NOT_FOUND');
  });
  mocks.redirect.mockImplementation(() => {
    throw new Error('NEXT_REDIRECT');
  });
  mocks.permanentRedirect.mockImplementation(() => {
    throw new Error('NEXT_PERMANENT_REDIRECT');
  });
  mocks.pathname = '/en/book/hamlet/summary';
  mocks.resolveRetiredSlug.mockResolvedValue(null);
  mocks.getBookOverview.mockResolvedValue(makeBook());
  mocks.getPublicBookSummary.mockResolvedValue(SUMMARY);
  mocks.resolveSeo.mockResolvedValue({ meta: { robots: 'index, follow' } });
});

describe('страница пересказа: содержимое', () => {
  it('рисует пересказ версии языка страницы на сервере, без анализа и тем', async () => {
    const { container } = await renderPage();

    expect(mocks.getPublicBookSummary).toHaveBeenCalledWith('v-en');
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Hamlet: Summary');
    expect(container.textContent).toContain('The ghost appears to Hamlet.');
    expect(container.textContent).not.toContain('ANALYSIS-TEXT');
    expect(container.textContent).not.toContain('THEMES-TEXT');
  });

  it('предупреждение о спойлерах и время чтения - в шапке и в сведениях о книге', async () => {
    const { container } = await renderPage();

    expect(screen.getByRole('note').textContent).toContain('Spoiler warning');
    expect(container.querySelector('header')?.textContent).toContain('1 min read');
    expect(container.querySelector('aside')?.textContent).toContain(
      'Summary reading time1 min read'
    );
  });

  it.each([
    ['es', 'Actualizado el 12 de octubre de 2026'],
    ['fr', 'Mis à jour le 12 octobre 2026'],
    ['pt', 'Atualizado em 12 de outubro de 2026'],
    ['ru', 'Обновлено 12 октября 2026 г.'],
  ])('%s: подпись редакции с датой на языке страницы', async (lang, expected) => {
    mocks.pathname = `/${lang}/book/hamlet/summary`;
    mocks.getBookOverview.mockResolvedValue(makeBook({ versions: [version(lang, 'hamlet', 1)] }));
    const { container } = await renderPage(lang);

    expect(
      container.querySelector('a[href$="/editorial-policy#who"]')?.parentElement?.textContent
    ).toContain(expected);
  });

  it('название книги с </script> не разрывает разметку', async () => {
    mocks.getBookOverview.mockResolvedValue(
      makeBook({
        versions: [
          version('en', 'hamlet', 1, { title: 'Hamlet</script><script>alert(1)</script>' }),
        ],
      })
    );
    const { container } = await renderPage();

    const scripts = [...container.querySelectorAll('script')];
    expect(scripts.every((el) => el.getAttribute('type') === 'application/ld+json')).toBe(true);
    expect(scripts.some((el) => el.innerHTML.includes('</script>'))).toBe(false);
  });

  it('подпись редакции с датой изменения и разметка Article на новом адресе', async () => {
    const { container } = await renderPage();

    const link = screen.getByRole('link', { name: 'Bibliaris Editorial Team' });
    expect(link.getAttribute('href')).toBe('/en/editorial-policy#who');
    expect(link.parentElement?.textContent).toBe(
      'Bibliaris Editorial Team · Updated October 12, 2026'
    );

    const scripts = [...container.querySelectorAll('script[type="application/ld+json"]')].map(
      (s) => JSON.parse(s.textContent ?? '{}') as Record<string, unknown>
    );
    const article = scripts.find((ld) => ld['@type'] === 'Article');
    expect(article?.url).toBe(buildLangUrl('en', '/book/hamlet/summary'));
    expect(article?.dateModified).toBe(UPDATED_AT);
    expect(scripts.some((ld) => ld['@type'] === 'BreadcrumbList')).toBe(true);
    // FAQ стоит блоком, но его разметка FAQPage живёт на странице книги - здесь её нет.
    expect(scripts.some((ld) => ld['@type'] === 'FAQPage')).toBe(false);
    expect(container.textContent).toContain('Who dies?');
  });

  it('битая дата - ни даты в подписи, ни разметки Article', async () => {
    mocks.getPublicBookSummary.mockResolvedValue({ ...SUMMARY, updatedAt: 'не-дата' });
    const { container } = await renderPage();

    expect(container.textContent).not.toContain('Invalid Date');
    expect(container.innerHTML).not.toContain('"Article"');
  });

  it('оглавление по разделам h2 с якорями в тексте', async () => {
    const { container } = await renderPage();

    const toc = screen.getByRole('navigation', { name: 'Contents' });
    const hrefs = [...toc.querySelectorAll('a')].map((a) => a.getAttribute('href'));
    expect(hrefs).toEqual(['#part-act-i', '#part-act-ii']);
    expect(container.querySelector('h2#part-act-i')?.textContent).toBe('Act I');
  });

  it('один раздел - оглавления нет', async () => {
    mocks.getPublicBookSummary.mockResolvedValue({
      ...SUMMARY,
      summary: '<h2>Story</h2><p>Short tale.</p>',
    });
    await renderPage();

    expect(screen.queryByRole('navigation', { name: 'Contents' })).toBeNull();
  });

  it('навигация по книге - только существующие разделы, пересказ активен', async () => {
    await renderPage();

    const nav = screen.getByRole('navigation', { name: 'Book sections' });
    const labels = [...nav.querySelectorAll('li')].map((li) => li.textContent);
    expect(labels).toEqual(['Book', 'Read', 'Summary']);
    expect(nav.querySelector('[aria-current="page"]')?.textContent).toBe('Summary');
  });

  it('«узнать больше» - только материалы, которые у книги есть', async () => {
    await renderPage();

    const hrefs = [
      ...document.querySelectorAll('section[aria-labelledby="summary-explore"] a'),
    ].map((a) => a.getAttribute('href'));
    expect(hrefs).toEqual(['/en/book/hamlet', '/en/book/hamlet#characters']);
  });
  // F03-2: пересказ ссылается на анализ - в навигации и в «узнать больше» (`product.md` F03 §22).
  it('анализ на языке страницы - пункт навигации и ссылка в «узнать больше»', async () => {
    mocks.getBookOverview.mockResolvedValue(
      makeBook({
        versions: [
          version('en', 'hamlet', 1, {
            _count: { chapters: 3, audioChapters: 0, summaries: 1, analyses: 1 },
          }),
        ],
      })
    );
    await renderPage();

    const nav = screen.getByRole('navigation', { name: 'Book sections' });
    expect(within(nav).getByRole('link', { name: 'Analysis' })).toHaveAttribute(
      'href',
      '/en/book/hamlet/analysis'
    );
    const hrefs = [
      ...document.querySelectorAll('section[aria-labelledby="summary-explore"] a'),
    ].map((a) => a.getAttribute('href'));
    expect(hrefs).toEqual(['/en/book/hamlet', '/en/book/hamlet/analysis']);
  });

  it('блок «читать или слушать» и «узнать больше» - по тому, что у книги есть', async () => {
    mocks.getBookOverview.mockResolvedValue(
      makeBook({
        versionIds: { text: 'v-en', audio: 'v-en' },
        versions: [
          version('en', 'hamlet', 1, {
            symbols: [{ title: 'Skull', description: 'Mortality' }],
            quotes: [{ text: 'To be' }],
          }),
        ],
      })
    );
    const { container } = await renderPage();

    const continueHrefs = [
      ...container.querySelectorAll('section[aria-labelledby="summary-continue"] a'),
    ].map((a) => a.getAttribute('href'));
    expect(continueHrefs).toEqual(['/en/book/hamlet/read', '/en/book/hamlet/listen']);
    const exploreHrefs = [
      ...container.querySelectorAll('section[aria-labelledby="summary-explore"] a'),
    ].map((a) => a.getAttribute('href'));
    expect(exploreHrefs).toEqual([
      '/en/book/hamlet',
      '/en/book/hamlet#symbols',
      '/en/book/hamlet#quotes',
    ]);
    const nav = screen.getByRole('navigation', { name: 'Book sections' });
    expect([...nav.querySelectorAll('li')].map((li) => li.textContent)).toEqual([
      'Book',
      'Read',
      'Listen',
      'Summary',
    ]);
  });

  it('h1 из редактора понижен до h2: заголовок первого уровня один, раздел в оглавлении', async () => {
    mocks.getPublicBookSummary.mockResolvedValue({
      ...SUMMARY,
      summary: '<h1>Prologue</h1><p>Night.</p><h2>Act I</h2><p>The ghost.</p>',
    });
    const { container } = await renderPage();

    expect(container.querySelectorAll('h1')).toHaveLength(1);
    expect(container.querySelector('h2#part-prologue')?.textContent).toBe('Prologue');
    const toc = screen.getByRole('navigation', { name: 'Contents' });
    expect([...toc.querySelectorAll('a')].map((a) => a.textContent)).toEqual(['Prologue', 'Act I']);
  });
});

describe('страница пересказа: 404 и отказы', () => {
  it('язык без пересказа - 404, пересказ другого языка не подставляется', async () => {
    mocks.pathname = '/ru/book/gamlet/summary';
    mocks.getBookOverview.mockResolvedValue(makeBook({ slug: 'gamlet' }));

    await expect(renderPage('ru', 'gamlet')).rejects.toThrow('NEXT_NOT_FOUND');
    expect(mocks.getPublicBookSummary).not.toHaveBeenCalled();
  });

  it('пересказа нет в ответе - 404', async () => {
    mocks.getPublicBookSummary.mockResolvedValue(null);

    await expect(renderPage()).rejects.toThrow('NEXT_NOT_FOUND');
  });

  it('пересказ без видимого текста - 404', async () => {
    mocks.getPublicBookSummary.mockResolvedValue({ ...SUMMARY, summary: '<p>&nbsp;</p>' });

    await expect(renderPage()).rejects.toThrow('NEXT_NOT_FOUND');
  });

  it('сбой ручки пересказа - наверх (5xx), а не 404', async () => {
    mocks.getPublicBookSummary.mockRejectedValue(
      new ApiError({ message: 'Too many requests', statusCode: 429 })
    );

    await expect(renderPage()).rejects.toThrow('Too many requests');
    expect(mocks.notFound).not.toHaveBeenCalled();
  });

  // 🔴 Неизвестное - не «нет пересказа»: иначе сужение белого списка на бэкенде похоронило бы
  // весь раздел под кэшируемым 404 при зелёных тестах.
  it('нет поля versions - отказ, а не 404', async () => {
    mocks.getBookOverview.mockResolvedValue(makeBook({ versions: undefined }));

    await expect(renderPage()).rejects.toThrow(/carries no versions array/);
    expect(mocks.notFound).not.toHaveBeenCalled();
  });

  it('нет счётчика пересказов у версии языка - отказ, а не 404', async () => {
    mocks.getBookOverview.mockResolvedValue(
      makeBook({ versions: [{ ...version('en', 'hamlet', 1), _count: undefined }] })
    );

    await expect(renderPage()).rejects.toThrow(/carries no summary count/);
    expect(mocks.notFound).not.toHaveBeenCalled();
  });

  it('книги нет - 404, переименованная - 308 на пересказ преемника', async () => {
    mocks.getBookOverview.mockRejectedValue(
      new ApiError({ message: 'Not found', statusCode: 404 })
    );
    await expect(renderPage('en', 'never')).rejects.toThrow('NEXT_NOT_FOUND');

    mocks.resolveRetiredSlug.mockResolvedValue('hamlet-new');
    await expect(renderPage('en', 'hamlet-old')).rejects.toThrow('NEXT_PERMANENT_REDIRECT');
    expect(mocks.permanentRedirect).toHaveBeenCalledWith('/en/book/hamlet-new/summary');
  });

  it('неканонический слаг - 307 на канонический адрес пересказа', async () => {
    await expect(renderPage('en', 'hamlet-other')).rejects.toThrow('NEXT_REDIRECT');
    expect(mocks.redirect).toHaveBeenCalledWith('/en/book/hamlet/summary');
  });
  it('ручка пересказа ответила 404 - страница 404', async () => {
    mocks.getPublicBookSummary.mockRejectedValue(
      new ApiError({ message: 'Not found', statusCode: 404 })
    );

    await expect(renderPage()).rejects.toThrow('NEXT_NOT_FOUND');
  });

  it('в ответе нет поля summary - отказ, а не 404', async () => {
    mocks.getPublicBookSummary.mockResolvedValue({ id: 's1', updatedAt: UPDATED_AT });

    await expect(renderPage()).rejects.toThrow(/carries no summary text/);
    expect(mocks.notFound).not.toHaveBeenCalled();
  });
});

describe('страница пересказа: метаданные', () => {
  it('свой title, описание из текста, canonical на себя, hreflang только языков с пересказом', async () => {
    const meta = await metadataFor();

    expect(meta.title).toBe('Hamlet Summary | Bibliaris');
    expect(meta.description).toBe('The ghost appears to Hamlet. Hamlet feigns madness.');
    expect(meta.robots).toBeUndefined();
    expect(meta.alternates?.canonical).toBe(buildLangUrl('en', '/book/hamlet/summary'));
    expect(meta.alternates?.languages).toEqual({
      en: buildLangUrl('en', '/book/hamlet/summary'),
      fr: buildLangUrl('fr', '/book/hamlet-fr/summary'),
      'x-default': buildLangUrl('en', '/book/hamlet/summary'),
    });
  });

  it('книга закрыта редактором от индекса - пересказ тоже noindex и без hreflang', async () => {
    mocks.resolveSeo.mockResolvedValue({ meta: { robots: 'noindex, follow' } });
    const meta = await metadataFor();

    expect(meta.robots).toEqual({ index: false, follow: true });
    expect(meta.alternates?.languages).toBeUndefined();
  });

  it('пересказа нет - noindex', async () => {
    mocks.getPublicBookSummary.mockResolvedValue(null);

    expect((await metadataFor()).robots).toEqual({ index: false, follow: true });
  });

  it('сбой API - наверх (5xx), noindex не угадывается', async () => {
    mocks.getBookOverview.mockRejectedValue(
      new ApiError({ message: 'Too many requests', statusCode: 429 })
    );

    await expect(metadataFor()).rejects.toThrow('Too many requests');
  });
  it('книги нет (404 API) - noindex, без 5xx', async () => {
    mocks.getBookOverview.mockRejectedValue(
      new ApiError({ message: 'Not found', statusCode: 404 })
    );

    expect((await metadataFor()).robots).toEqual({ index: false, follow: true });
  });

  it('openGraph: статья, свой адрес, обложка с подписью версии', async () => {
    mocks.getBookOverview.mockResolvedValue(
      makeBook({
        coverUrl: 'https://media.example.com/c.jpg',
        versions: [version('en', 'hamlet', 1, { coverAlt: 'Hamlet cover' })],
      })
    );
    const meta = await metadataFor();

    expect(meta.openGraph).toMatchObject({
      type: 'article',
      url: buildLangUrl('en', '/book/hamlet/summary'),
      images: [{ url: 'https://media.example.com/c.jpg', alt: 'Hamlet cover' }],
    });
  });
});
