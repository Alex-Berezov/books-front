import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import AuthorDetailClient from '@/app/[lang]/author/[authorSlug]/AuthorDetailClient';
import type { PublicAuthorDetail } from '@/types/api-schema';

/**
 * 🔴 `LEGACY-447`: `wikipediaUrl`/`wikidataUrl` пишет контент-менеджер и они уходят в `href`
 * публичной страницы автора. Ссылка с не-`http(s)` схемой не рендерится, соседняя годная — да.
 */

const { authorRef } = vi.hoisted(() => ({ authorRef: { current: null as unknown } }));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/en/author/oscar-wilde',
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({ lang: 'en' }),
}));
vi.mock('@/components/public/navigation', () => ({ useSmartBack: () => vi.fn() }));
vi.mock('@/api/hooks/useAuthors', () => ({
  usePublicAuthor: () => ({ data: authorRef.current, isLoading: false }),
}));

const author = (links: { wikipediaUrl?: string; wikidataUrl?: string }) =>
  ({
    name: 'Oscar Wilde',
    books: [],
    biography: '',
    quotes: [],
    faq: [],
    similarAuthors: [],
    photoUrl: null,
    ...links,
  }) as unknown as PublicAuthorDetail;

const renderWith = (links: { wikipediaUrl?: string; wikidataUrl?: string }) => {
  authorRef.current = author(links);
  render(<AuthorDetailClient lang="en" authorSlug="oscar-wilde" displayName="Oscar Wilde" />);
};

describe('AuthorDetailClient: внешние ссылки (LEGACY-447)', () => {
  it('не рендерит javascript: и рендерит соседнюю https-ссылку', () => {
    renderWith({
      wikipediaUrl: 'javascript:alert(1)',
      wikidataUrl: 'https://www.wikidata.org/wiki/Q30875',
    });

    expect(screen.queryByRole('link', { name: /Wikipedia/ })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Wikidata/ })).toHaveAttribute(
      'href',
      'https://www.wikidata.org/wiki/Q30875'
    );
  });

  it('не рендерит блок ссылок, когда обе небезопасны', () => {
    renderWith({ wikipediaUrl: 'javascript:alert(1)', wikidataUrl: 'data:text/html,x' });

    expect(screen.queryByRole('link', { name: /Wikipedia|Wikidata/ })).not.toBeInTheDocument();
  });
});
