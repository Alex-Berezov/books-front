import { describe, expect, it } from 'vitest';
import { buildRelationMap, RELATION_MAP_MAX_NODES } from '@/lib/book-analysis/relation-map';
import type { BookAnalysisCharacter } from '@/types/api-schema';

/**
 * Раскладка карты отношений героев (F03-3, `product.md` §10, решение арбитра `F03 | F03-3`, В1):
 * до 12 узлов, только главные и второстепенные, линия - одна на пару, порог - две линии.
 */

const hero = (
  key: string,
  role: BookAnalysisCharacter['role'],
  relations: { to: string; label: string }[] = []
): BookAnalysisCharacter => ({ key, name: key.toUpperCase(), role, relations });

describe('buildRelationMap', () => {
  it('2 героя и одна связь - карты нет: одна линия картой не является', () => {
    expect(
      buildRelationMap([hero('a', 'main', [{ to: 'b', label: 'friend' }]), hero('b', 'secondary')])
    ).toBeNull();
  });

  it('встречные связи одной пары - одна линия, подписи через « / », порог не пройден', () => {
    const chars = [
      hero('a', 'main', [{ to: 'b', label: 'brother' }]),
      hero('b', 'main', [{ to: 'a', label: 'sister' }]),
    ];
    expect(buildRelationMap(chars)).toBeNull();

    const map = buildRelationMap([
      ...chars,
      hero('c', 'secondary', [{ to: 'a', label: 'servant' }]),
    ]);
    expect(map?.lines.map((l) => l.label)).toEqual(['brother / sister', 'servant']);
    // В списке каждая связь - отдельно со своим направлением.
    expect(map?.entries).toEqual([
      { from: 'A', to: 'B', label: 'brother' },
      { from: 'B', to: 'A', label: 'sister' },
      { from: 'C', to: 'A', label: 'servant' },
    ]);
  });

  it('одинаковые подписи встречных связей - одной', () => {
    const map = buildRelationMap([
      hero('a', 'main', [
        { to: 'b', label: 'brother' },
        { to: 'c', label: 'son' },
      ]),
      hero('b', 'main', [{ to: 'a', label: 'brother' }]),
      hero('c', 'secondary'),
    ]);
    expect(map?.lines.find((l) => l.to.key === 'b' || l.from.key === 'b')?.label).toBe('brother');
  });

  it('эпизодический герой не попадает на карту ни целью, ни источником', () => {
    const map = buildRelationMap([
      hero('a', 'main', [
        { to: 'b', label: 'x' },
        { to: 'm', label: 'y' },
      ]),
      hero('b', 'secondary', [{ to: 'c', label: 'z' }]),
      hero('c', 'secondary'),
      hero('m', 'minor', [{ to: 'c', label: 'w' }]),
    ]);
    expect(map?.nodes.map((n) => n.key)).toEqual(['a', 'b', 'c']);
    expect(map?.entries.map((e) => e.label)).toEqual(['x', 'z']);
  });

  it('12 узлов - ровно 12; 13-й и его связи не рисуются и не считаются', () => {
    const keys = Array.from({ length: 13 }, (_, i) => `h${i}`);
    // Каждый связан со следующим по кругу: 13 связей, у 13-го - связь с первым.
    const chars = keys.map((k, i) =>
      hero(k, i === 0 ? 'main' : 'secondary', [{ to: keys[(i + 1) % 13], label: `r${i}` }])
    );
    const map = buildRelationMap(chars);
    expect(map?.nodes).toHaveLength(RELATION_MAP_MAX_NODES);
    expect(map?.nodes.map((n) => n.key)).not.toContain('h12');
    expect(map?.entries.map((e) => e.label)).not.toContain('r11');
    expect(map?.entries.map((e) => e.label)).not.toContain('r12');
    expect(map?.lines).toHaveLength(11);
  });

  it('связь на себя, на неизвестного героя и с пустой подписью не рисуется', () => {
    const map = buildRelationMap([
      hero('a', 'main', [
        { to: 'a', label: 'self' },
        { to: 'ghost', label: 'nobody' },
        { to: 'b', label: '  ' },
        { to: 'b', label: 'x' },
      ]),
      hero('b', 'secondary', [{ to: 'c', label: 'y' }]),
      hero('c', 'secondary'),
    ]);
    expect(map?.entries.map((e) => e.label)).toEqual(['x', 'y']);
  });

  it('точный повтор связи - одной строкой', () => {
    const map = buildRelationMap([
      hero('a', 'main', [
        { to: 'b', label: 'x' },
        { to: 'b', label: 'x' },
        { to: 'c', label: 'y' },
      ]),
      hero('b', 'secondary'),
      hero('c', 'secondary'),
    ]);
    expect(map?.entries).toHaveLength(2);
  });

  it('герой, у которого после отбора не осталось линий, на карту не выводится', () => {
    const keys = Array.from({ length: 13 }, (_, i) => `h${i}`);
    // h1..h10 связаны с h0; h11 связан только с h12, а h12 - тринадцатый и на карту не попадает.
    const chars = [
      ...keys
        .slice(0, 11)
        .map((k, i) =>
          hero(k, i === 0 ? 'main' : 'secondary', i === 0 ? [] : [{ to: 'h0', label: `r${i}` }])
        ),
      hero('h11', 'secondary', [{ to: 'h12', label: 'lost' }]),
      hero('h12', 'secondary', [{ to: 'h11', label: 'lost-back' }]),
    ];
    const map = buildRelationMap(chars);
    // h11 попал в 12 отобранных, но его единственная пара - с h12 вне карты: линии нет, узла нет.
    expect(map?.nodes.map((n) => n.key)).not.toContain('h11');
    expect(map?.nodes).toHaveLength(11);
  });

  it('сначала главные, внутри роли - порядок данных', () => {
    const map = buildRelationMap([
      hero('s1', 'secondary', [{ to: 'm1', label: 'a' }]),
      hero('m1', 'main', [{ to: 's2', label: 'b' }]),
      hero('s2', 'secondary'),
    ]);
    expect(map?.nodes.map((n) => n.key)).toEqual(['m1', 's1', 's2']);
  });

  it('тот же вход - те же координаты; один главный - в центре', () => {
    const chars = [
      hero('a', 'main', [
        { to: 'b', label: 'x' },
        { to: 'c', label: 'y' },
      ]),
      hero('b', 'secondary'),
      hero('c', 'secondary'),
    ];
    const first = buildRelationMap(chars);
    expect(buildRelationMap(chars)).toEqual(first);
    expect(first?.nodes[0]).toMatchObject({ key: 'a', x: 320, y: 240 });
  });
});
