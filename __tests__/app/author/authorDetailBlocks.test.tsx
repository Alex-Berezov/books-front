import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import AuthorDetailClient from '@/app/[lang]/author/[authorSlug]/AuthorDetailClient';
import type { BookCardModel, PublicAuthorDetail } from '@/types/api-schema';

/**
 * F02-1: похожие авторы — настоящие ссылки на язык страницы, автор без перевода — текстом;
 * видимые крошки «Главная → Авторы → имя»; отдельного блока «Аудиокниги» нет.
 */

const { authorRef } = vi.hoisted(() => ({ authorRef: { current: null as unknown } }));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/ru/author/oskar-uajld',
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({ lang: 'ru' }),
}));
vi.mock('@/components/public/navigation', () => ({ useSmartBack: () => vi.fn() }));
vi.mock('@/api/hooks/useAuthors', () => ({
  usePublicAuthor: () => ({ data: authorRef.current, isLoading: false }),
}));

const book = (over: Partial<BookCardModel> = {}): BookCardModel & { firstPublishedYear: null } => ({
  id: 'b1',
  slug: 'portret-doriana-greya',
  title: 'Портрет Дориана Грея',
  author: 'Оскар Уайльд',
  authorSlug: 'oskar-uajld',
  coverImageUrl: null,
  rating: null,
  ratingsCount: 0,
  hasText: true,
  hasAudio: true,
  publishedAt: null,
  categoryIds: [],
  firstPublishedYear: null,
  ...over,
});

const renderWith = (over: Partial<PublicAuthorDetail>) => {
  authorRef.current = {
    id: 'auth1',
    slug: 'oskar-uajld',
    name: 'Оскар Уайльд',
    biography: '',
    quotes: [],
    faq: [],
    similarAuthors: [],
    photoUrl: null,
    books: [book()],
    booksTotal: 1,
    ...over,
  } as PublicAuthorDetail;
  return render(
    <AuthorDetailClient lang="ru" authorSlug="oskar-uajld" displayName="Оскар Уайльд" />
  );
};

describe('AuthorDetailClient: похожие авторы (F02-1)', () => {
  it('рендерит ссылки a[href] на язык страницы, а не кнопки', () => {
    renderWith({
      similarAuthors: [
        { name: 'Бернард Шоу', slug: 'bernard-shou' },
        { name: 'Оскар Уайльд-младший', slug: 'oskar-mladshij' },
      ],
    });

    const link = screen.getByRole('link', { name: 'Бернард Шоу' });
    expect(link.tagName).toBe('A');
    expect(link).toHaveAttribute('href', '/ru/author/bernard-shou');
    expect(screen.queryByRole('button', { name: 'Бернард Шоу' })).not.toBeInTheDocument();
  });

  it('автор без перевода на язык страницы — имя текстом, без ссылки', () => {
    renderWith({ similarAuthors: [{ name: 'Bernard Shaw', slug: null }] });

    expect(screen.getByText('Bernard Shaw')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Bernard Shaw' })).not.toBeInTheDocument();
  });
});

describe('AuthorDetailClient: крошки и книги (F02-1)', () => {
  it('видимые крошки — Главная → Авторы → имя', () => {
    renderWith({});

    const nav = screen.getByRole('navigation', { name: 'Хлебные крошки' });
    expect(within(nav).getByRole('link', { name: 'Главная' })).toHaveAttribute('href', '/ru');
    expect(within(nav).getByRole('link', { name: 'Авторы' })).toHaveAttribute(
      'href',
      '/ru/authors'
    );
    expect(within(nav).getByText('Оскар Уайльд')).toHaveAttribute('aria-current', 'page');
  });

  it('нет отдельного блока «Аудиокниги» — книга с аудио выводится один раз', () => {
    // Карточка сама печатает название больше одного раза; сравнивается с той же книгой без аудио.
    const { unmount } = renderWith({ books: [book({ hasAudio: false })] });
    const withoutAudio = screen.getAllByText('Портрет Дориана Грея').length;
    unmount();

    renderWith({ books: [book({ hasAudio: true })] });

    expect(screen.queryByRole('heading', { name: 'Аудиокниги' })).not.toBeInTheDocument();
    expect(screen.getAllByText('Портрет Дориана Грея')).toHaveLength(withoutAudio);
  });

  it('счётчик в шапке — booksTotal, а не длина списка', () => {
    renderWith({ booksTotal: 7 });

    expect(screen.getByText(/^7\s/)).toBeInTheDocument();
  });

  it('без booksTotal (ответ до F02-1) счётчик — длина списка', () => {
    renderWith({ booksTotal: undefined });

    expect(screen.getByText(/^1\s/)).toBeInTheDocument();
  });

  // Карточка ведёт на автора по `authorSlug` из ответа — слаг не выводится из имени (LEGACY-006).
  it('ссылка на автора в карточке — authorSlug из ответа', () => {
    renderWith({ books: [book({ author: 'Оскар Уайльд', authorSlug: 'oskar-uajld-2' })] });

    expect(
      screen.getAllByRole('link').some((a) => a.getAttribute('href') === '/ru/author/oskar-uajld-2')
    ).toBe(true);
  });
});
