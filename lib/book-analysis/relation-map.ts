import type { BookAnalysisCharacter } from '@/types/api-schema';
import { sortCharacters } from './format';

/**
 * Раскладка карты отношений героев (F03-3, `product.md` §10, `tech.md` T9): чистая функция,
 * SVG по ней рисует сервер. Без зависимостей и без случайности - тот же вход, те же координаты.
 */

/** Больше скольких героев на карте нет (§10). */
export const RELATION_MAP_MAX_NODES = 12;

/** Меньше скольких линий карты нет вовсе - ни схемы, ни списка (§10). */
export const RELATION_MAP_MIN_LINES = 2;

/** Поле схемы: `viewBox` SVG, центр и радиусы колец. */
export const RELATION_MAP_VIEWBOX = { width: 640, height: 480 } as const;
const CENTER = { x: RELATION_MAP_VIEWBOX.width / 2, y: RELATION_MAP_VIEWBOX.height / 2 };
const INNER_RADIUS = 100;
/** Радиус кружка героя на схеме и отступ его имени над кружком. */
export const RELATION_MAP_NODE_RADIUS = { main: 9, secondary: 6 } as const;
export const RELATION_MAP_NAME_OFFSET = 14;
const OUTER_RADIUS = 190;

export interface RelationMapNode {
  key: string;
  name: string;
  role: 'main' | 'secondary';
  x: number;
  y: number;
}

/** Линия - одна на пару героев; подписи встречных связей через « / » (решение арбитра `F03 | F03-3`, В1). */
export interface RelationMapLine {
  from: RelationMapNode;
  to: RelationMapNode;
  label: string;
}

/** Связь текстом со своим направлением: список на узком экране и подпись схемы. */
export interface RelationMapEntry {
  from: string;
  to: string;
  label: string;
}

export interface RelationMap {
  nodes: RelationMapNode[];
  lines: RelationMapLine[];
  entries: RelationMapEntry[];
}

type MapCharacter = BookAnalysisCharacter & { role: 'main' | 'secondary' };

/**
 * Карта или `null`, когда рисовать нечего. Узлы - главные и второстепенные герои со связью
 * с другим таким же героем, не больше 12: сначала главные, внутри роли - порядок данных (§7).
 * Связь рисуется, только если оба героя попали на карту: эпизодический герой не попадает
 * ни целью, ни источником (импорт проверяет только цель). Герой, у которого после отбора
 * не осталось ни одной линии, на карту не выводится.
 */
export function buildRelationMap(characters: readonly BookAnalysisCharacter[]): RelationMap | null {
  const eligible = sortCharacters(characters).filter(
    (c): c is MapCharacter => c.role === 'main' || c.role === 'secondary'
  );
  const eligibleKeys = new Set(eligible.map((c) => c.key));
  const related = new Set<string>();
  for (const c of eligible) {
    for (const r of c.relations ?? []) {
      if (r.to !== c.key && eligibleKeys.has(r.to)) {
        related.add(c.key);
        related.add(r.to);
      }
    }
  }
  const picked = eligible.filter((c) => related.has(c.key)).slice(0, RELATION_MAP_MAX_NODES);
  const pickedByKey = new Map(picked.map((c) => [c.key, c]));

  // Связи данных между отобранными героями, повторы одной и той же связи - одной строкой.
  const entries: { from: MapCharacter; to: MapCharacter; label: string }[] = [];
  const seen = new Set<string>();
  for (const c of picked) {
    for (const r of c.relations ?? []) {
      const target = pickedByKey.get(r.to);
      const label = r.label.trim();
      if (!target || target.key === c.key || !label) continue;
      const id = JSON.stringify([c.key, target.key, label]);
      if (seen.has(id)) continue;
      seen.add(id);
      entries.push({ from: c, to: target, label });
    }
  }

  // Линия на пару без учёта направления; подписи - в порядке данных, одинаковые - одной.
  const pairs = new Map<string, { a: MapCharacter; b: MapCharacter; labels: string[] }>();
  for (const e of entries) {
    const id = JSON.stringify([e.from.key, e.to.key].sort());
    const pair = pairs.get(id) ?? { a: e.from, b: e.to, labels: [] };
    if (!pair.labels.includes(e.label)) pair.labels.push(e.label);
    pairs.set(id, pair);
  }
  if (pairs.size < RELATION_MAP_MIN_LINES) return null;

  const onMap = new Set([...pairs.values()].flatMap((p) => [p.a.key, p.b.key]));
  const nodes = placeNodes(picked.filter((c) => onMap.has(c.key)));
  const nodeByKey = new Map(nodes.map((n) => [n.key, n]));
  const node = (key: string) => nodeByKey.get(key) as RelationMapNode;

  return {
    nodes,
    lines: [...pairs.values()].map((p) => ({
      from: node(p.a.key),
      to: node(p.b.key),
      label: p.labels.join(' / '),
    })),
    entries: entries.map((e) => ({ from: e.from.name, to: e.to.name, label: e.label })),
  };
}

/**
 * Главные - на внутреннем кольце (один главный - в центре), второстепенные - на внешнем;
 * первый узел кольца - сверху, дальше по часовой стрелке. Без главных внешнее кольцо одно.
 */
function placeNodes(characters: readonly MapCharacter[]): RelationMapNode[] {
  const main = characters.filter((c) => c.role === 'main');
  const secondary = characters.filter((c) => c.role === 'secondary');
  const ring = (list: readonly MapCharacter[], radius: number) =>
    list.map((c, i) => {
      const r = list.length === 1 && radius === INNER_RADIUS ? 0 : radius;
      const angle = -Math.PI / 2 + (2 * Math.PI * i) / list.length;
      return {
        key: c.key,
        name: c.name,
        role: c.role,
        x: Math.round(CENTER.x + r * Math.cos(angle)),
        y: Math.round(CENTER.y + r * Math.sin(angle)),
      };
    });
  return [...ring(main, INNER_RADIUS), ...ring(secondary, OUTER_RADIUS)];
}
