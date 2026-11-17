import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { RelationMap } from '@/app/[lang]/book/[slug]/analysis/RelationMap';
import { ThemeStrip } from '@/app/[lang]/book/[slug]/analysis/ThemeStrip';
import { buildRelationMap } from '@/lib/book-analysis/relation-map';

/**
 * Обобщения F08-3b: полоса присутствия героя - тот же `ThemeStrip` с другой подписью и цветом, карта
 * отношений мира - тот же `RelationMap` с узлами-ссылками. Без параметров обе рисуются как у анализа.
 */

const linker = {
  label: (n: number) => `Chapter ${n}`,
  href: (n: number) => (n <= 3 ? `/read?chapter=${n}` : null),
};

describe('ThemeStrip: подпись и цвет параметрами', () => {
  it('подпись клеток и слово перед номерами - из параметров, цвет - классом обёртки', () => {
    const { container } = render(
      <ThemeStrip
        themeChapters={[1, 2, 3, 7]}
        chapterNumbers={[1, 2, 3, 4, 5, 6, 7]}
        linker={linker}
        label="Chapters where Anna appears"
        chaptersLabel="Chapters"
        colorClassName="presence-color"
      />
    );
    expect(container.firstElementChild?.className).toContain('presence-color');
    expect(container.querySelector('ol')?.getAttribute('aria-label')).toBe(
      'Chapters where Anna appears'
    );
    expect(container.querySelector('p')?.textContent).toBe('Chapters: 1–3, 7');
    // Клетка-ссылка - только у главы, на которую линкер даёт адрес.
    expect(container.querySelectorAll('ol a')).toHaveLength(3);
  });

  it('без цвета - обычный класс полосы; нет существующих глав - ничего', () => {
    const { container, rerender } = render(
      <ThemeStrip
        themeChapters={[1]}
        chapterNumbers={[1]}
        linker={linker}
        label="l"
        chaptersLabel="c"
      />
    );
    expect(container.firstElementChild?.className.trim().split(/\s+/)).toHaveLength(1);
    rerender(
      <ThemeStrip
        themeChapters={[9]}
        chapterNumbers={[1]}
        linker={linker}
        label="l"
        chaptersLabel="c"
      />
    );
    expect(container.firstElementChild).toBeNull();
  });

  it('больше 120 глав - клеток нет, подпись остаётся', () => {
    const many = Array.from({ length: 121 }, (_, i) => i + 1);
    const { container } = render(
      <ThemeStrip
        themeChapters={[1, 2, 7]}
        chapterNumbers={many}
        linker={linker}
        label="l"
        chaptersLabel="Chapters"
      />
    );
    expect(container.querySelector('ol')).toBeNull();
    expect(container.querySelector('p')?.textContent).toBe('Chapters: 1–2, 7');
  });
});

describe('RelationMap: узлы-ссылки', () => {
  const map = buildRelationMap([
    {
      key: 'a',
      name: 'Anna',
      role: 'main',
      relations: [
        { to: 'b', label: 'friend' },
        { to: 'c', label: 'foe' },
      ],
    },
    { key: 'b', name: 'Boris', role: 'secondary', relations: null },
    { key: 'c', name: 'Cora', role: 'secondary', relations: null },
  ]);

  it('без nodeHref - как у анализа: ни одной ссылки', () => {
    expect(map).not.toBeNull();
    const { container } = render(<RelationMap map={map!} title="Relations" />);
    expect(container.querySelectorAll('a')).toHaveLength(0);
    expect(container.querySelector('li')?.textContent).toBe('Anna → friend → Boris');
  });

  it('с nodeHref - ссылки на узлах и в списке только там, где адрес есть', () => {
    const { container } = render(
      <RelationMap
        map={map!}
        title="Relations"
        nodeHref={(key) => (key === 'c' ? null : `/wiki/${key}`)}
      />
    );
    const svgLinks = [...container.querySelectorAll('svg a')].map((a) => a.getAttribute('href'));
    expect(svgLinks).toEqual(['/wiki/a', '/wiki/b']);
    const listLinks = [...container.querySelectorAll('li a')].map((a) => a.getAttribute('href'));
    expect(listLinks).toContain('/wiki/a');
    expect(listLinks).not.toContain('/wiki/c');
    expect(container.querySelectorAll('li')[1]?.textContent).toBe('Anna → foe → Cora');
  });

  it('тёзки: ссылка в списке ведёт по ключу связи, а не по имени', () => {
    const twins = buildRelationMap([
      {
        key: 'ned-fox',
        name: 'Ned',
        role: 'main',
        relations: [
          { to: 'ned-lark', label: 'brother' },
          { to: 'mia', label: 'friend' },
        ],
      },
      { key: 'ned-lark', name: 'Ned', role: 'secondary', relations: null },
      { key: 'mia', name: 'Mia', role: 'secondary', relations: null },
    ]);
    const { container } = render(
      <RelationMap map={twins!} title="Relations" nodeHref={(key) => `/wiki/${key}`} />
    );
    const first = [...container.querySelectorAll('li')[0].querySelectorAll('a')];
    expect(first.map((a) => a.getAttribute('href'))).toEqual(['/wiki/ned-fox', '/wiki/ned-lark']);
  });

  it('withHeading=false: заголовка h3 нет, подпись схемы остаётся', () => {
    const { container } = render(<RelationMap map={map!} title="Relations" withHeading={false} />);
    expect(container.querySelector('h3')).toBeNull();
    expect(container.querySelector('svg')).toHaveAttribute('aria-label', 'Relations');
  });
});
