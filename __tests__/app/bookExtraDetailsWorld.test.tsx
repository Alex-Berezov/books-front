import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import BookExtraDetails from '@/app/[lang]/book/[slug]/BookExtraDetails';
import { buildBookPageWorld } from '@/app/[lang]/book/[slug]/worldLinks';
import type { BookOverview, BookWorldListEntity } from '@/types/api-schema';

/**
 * F08-5 на настоящем `BookExtraDetails` (страница книги): «Герои книги» - сразу после персонажей
 * (решение арбитра `F08 | F08-5` Q4), «Подробнее о герое» - по карточкам из `buildBookPageWorld`.
 */

const hero = (key: string, name: string, forms: string[], extra = {}): BookWorldListEntity =>
  ({
    key,
    type: 'character',
    name,
    role: 'main',
    short: null,
    hasCore: true,
    isIndexable: true,
    mentionFirst: 1,
    updatedAt: '2026-11-01T00:00:00.000Z',
    forms,
    ...extra,
  }) as BookWorldListEntity;

const version = (over: Record<string, unknown> = {}) =>
  ({
    id: 'v1',
    characters: [
      { name: 'Hamlet', description: 'Prince' },
      { name: 'Ghost', description: 'Father' },
      { name: 'constructor', description: 'Not a hero' },
    ],
    symbols: [{ title: 'Skull', description: 'Mortality' }],
    quotes: [{ text: 'To be' }],
    faq: [],
    ...over,
  }) as unknown as BookOverview['versions'][0];

const SLOT = (
  <section data-testid="heroes">
    <h2>Characters in this book</h2>
  </section>
);

const h2Texts = (root: HTMLElement) => [...root.querySelectorAll('h2')].map((h) => h.textContent);

describe('BookExtraDetails: «Герои книги» и «Подробнее о герое» (F08-5)', () => {
  it('блок героев - сразу после персонажей и до цитат', () => {
    const { container } = render(<BookExtraDetails activeVersion={version()} heroesSlot={SLOT} />);
    expect(h2Texts(container)).toEqual([
      'Symbols',
      'Main Characters',
      'Characters in this book',
      'Quotes',
    ]);
  });

  it('персонажей нет - блок героев на их месте: после символов, до цитат', () => {
    const { container } = render(
      <BookExtraDetails activeVersion={version({ characters: [] })} heroesSlot={SLOT} />
    );
    expect(h2Texts(container)).toEqual(['Symbols', 'Characters in this book', 'Quotes']);
  });

  it('«Подробнее о герое» - у героя со страницей; без страницы и у constructor - нет', () => {
    const activeVersion = version();
    const { characterPages } = buildBookPageWorld({
      lang: 'en',
      worldSlug: 'hamlet',
      entities: [
        hero('hamlet', 'Hamlet', ['Hamlet']),
        hero('ghost', 'Ghost', ['Ghost'], { hasCore: false }),
      ],
      characters: activeVersion.characters ?? [],
    });
    render(
      <BookExtraDetails
        activeVersion={activeVersion}
        characterPages={characterPages}
        characterMore="More about the character"
      />
    );
    const more = screen.getAllByRole('link', { name: 'More about the character' });
    expect(more.map((a) => a.getAttribute('href'))).toEqual(['/en/book/hamlet/wiki/hamlet']);
    expect(more[0].closest('div')!.textContent).toContain('Hamlet');
  });
});
