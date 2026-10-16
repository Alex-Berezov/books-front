import { render, screen, within } from '@testing-library/react';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PublicAuthorDetail } from '@/types/api-schema';
import { fullAuthor, minimalAuthor } from '../../fixtures/author-page';

/**
 * Страница автора целиком (F02-1, F02-3, F02-4): видимые крошки, порядок блоков (`product.md` §2),
 * похожие авторы — настоящие ссылки, минимальный автор — без пустых блоков, отдельного блока
 * «Аудиокниги» и кнопки «Назад» нет.
 */

const mocks = vi.hoisted(() => ({ getPublicAuthorBySlug: vi.fn() }));

vi.mock('next/navigation', () => ({
  notFound: vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND');
  }),
  permanentRedirect: vi.fn(),
  usePathname: () => '/ru/author/lev-tolstoy',
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock('@/lib/seo/retired-slug', () => ({ resolveRetiredSlug: vi.fn() }));
vi.mock('@/api/endpoints/public', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/api/endpoints/public')>()),
  getPublicAuthorBySlug: mocks.getPublicAuthorBySlug,
}));

type PageModule = typeof import('@/app/[lang]/author/[authorSlug]/page');
let pageModule: PageModule;

beforeAll(async () => {
  pageModule = await import('@/app/[lang]/author/[authorSlug]/page');
}, 60_000);

const params = Promise.resolve({ lang: 'ru', authorSlug: 'lev-tolstoy' });

const renderPage = async (author: PublicAuthorDetail) => {
  mocks.getPublicAuthorBySlug.mockResolvedValue(author);
  return render(await pageModule.default({ params }));
};

const h2s = () => screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent);

describe('страница автора: блоки (F02-3)', () => {
  beforeEach(() => mocks.getPublicAuthorBySlug.mockReset());

  it('полный автор: блоки в порядке §2', async () => {
    await renderPage(
      fullAuthor({
        similarAuthors: [{ name: 'Фёдор Достоевский', slug: 'fedor-dostoevskiy' }],
        faq: [{ question: 'Вопрос?', answer: 'Ответ.' }],
      })
    );

    expect(h2s()).toEqual([
      'Коротко',
      'С чего начать',
      'Лев Толстой: книги на Bibliaris',
      'Биография',
      'Хронология',
      'Цитаты',
      'Влияния',
      'Премии и награды',
      'Экранизации и постановки',
      'Интересные факты',
      'Похожие авторы',
      'Часто задаваемые вопросы',
      'Источники',
    ]);
    // Подпись редакции — последней строкой страницы, после источников (§2, §16).
    const team = screen.getByRole('link', { name: 'Редакция Bibliaris' });
    expect(team).toHaveAttribute('href', '/ru/editorial-policy#authors');
    const sources = screen.getByRole('heading', { level: 2, name: 'Источники' });
    expect(sources.compareDocumentPosition(team) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(team.closest('footer')?.lastElementChild).toBe(team.parentElement);
  });

  it('минимальный автор: крошки, шапка и книги — пустых блоков нет', async () => {
    await renderPage(minimalAuthor());

    expect(screen.getByRole('heading', { level: 1, name: 'Лев Толстой' })).toBeInTheDocument();
    expect(h2s()).toEqual(['Лев Толстой: книги на Bibliaris']);
    // §1 п.1: у минимального автора подпись внизу есть, заголовка «Источники» нет (Р4).
    expect(screen.getByRole('link', { name: 'Редакция Bibliaris' })).toBeInTheDocument();
  });

  // Решение арбитра 15.10.2026, `F02 | F02-3`, Р4: путь назад дают видимые крошки.
  it('кнопки «Назад» нет', async () => {
    await renderPage(fullAuthor());

    expect(screen.queryByRole('button', { name: 'Назад' })).not.toBeInTheDocument();
  });

  it('видимые крошки — Главная → Авторы → имя', async () => {
    await renderPage(fullAuthor());

    const nav = screen.getByRole('navigation', { name: 'Хлебные крошки' });
    expect(within(nav).getByRole('link', { name: 'Главная' })).toHaveAttribute('href', '/ru');
    expect(within(nav).getByRole('link', { name: 'Авторы' })).toHaveAttribute(
      'href',
      '/ru/authors'
    );
    expect(within(nav).getByText('Лев Толстой')).toHaveAttribute('aria-current', 'page');
  });

  it('нет отдельного блока «Аудиокниги»', async () => {
    await renderPage(fullAuthor());

    expect(screen.queryByRole('heading', { name: 'Аудиокниги' })).not.toBeInTheDocument();
  });
});

describe('страница автора: похожие авторы (F02-1)', () => {
  beforeEach(() => mocks.getPublicAuthorBySlug.mockReset());

  it('рендерит ссылки a[href] на язык страницы, а не кнопки', async () => {
    await renderPage(
      fullAuthor({
        similarAuthors: [
          { name: 'Фёдор Достоевский', slug: 'fedor-dostoevskiy' },
          { name: 'Иван Тургенев', slug: 'ivan-turgenev' },
        ],
      })
    );

    const link = screen.getByRole('link', { name: 'Фёдор Достоевский' });
    expect(link.tagName).toBe('A');
    expect(link).toHaveAttribute('href', '/ru/author/fedor-dostoevskiy');
    expect(screen.queryByRole('button', { name: 'Фёдор Достоевский' })).not.toBeInTheDocument();
  });

  it('автор без перевода на язык страницы — имя текстом, без ссылки', async () => {
    await renderPage(fullAuthor({ similarAuthors: [{ name: 'Fyodor Dostoevsky', slug: null }] }));

    expect(screen.getByText('Fyodor Dostoevsky')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Fyodor Dostoevsky' })).not.toBeInTheDocument();
  });

  // Карточка ведёт на автора по `authorSlug` из ответа — слаг не выводится из имени (LEGACY-006).
  it('ссылка на автора в карточке книги — authorSlug из ответа', async () => {
    const base = minimalAuthor();
    await renderPage(minimalAuthor({ books: [{ ...base.books[0], authorSlug: 'lev-tolstoy-2' }] }));

    expect(
      screen.getAllByRole('link').some((a) => a.getAttribute('href') === '/ru/author/lev-tolstoy-2')
    ).toBe(true);
  });
});
