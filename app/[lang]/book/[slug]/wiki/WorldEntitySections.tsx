import { isWorldObjectType } from '@/lib/admin/book-world-blocks';
import { rankCoPresence } from '@/lib/book-world/format';
import type { WorldEntitySectionsInput } from './worldEntityTypes';
import type { PageSection } from '../analysis/PageSections';
import {
  buildEntityExternalSections,
  buildEntityFaqSection,
  buildEntityNextSection,
} from './WorldEntityMore';
import { buildEntityProfileSections, entityFirstChapter } from './WorldEntityProfile';
import { buildEntityStorySections } from './WorldEntityStory';
import { buildObjectSections } from './WorldObjectSections';
import { buildPlaceSections } from './WorldPlaceSections';

/**
 * Разделы страницы героя в порядке `product.md` §5 (п.4-п.15). Каждый раздел собирается, только если
 * у него есть данные: блок без данных не выводится вовсе - ни заголовка, ни пункта оглавления.
 */
export function buildEntitySections(input: WorldEntitySectionsInput): PageSection[] {
  const { entity, people } = input;

  // Совместное присутствие: ключи публичных героев (читателю отдаются только они).
  const publicKeys = new Set([...people].filter(([, p]) => p.href !== null).map(([key]) => key));
  const coPresence = rankCoPresence(entity.mentions?.coPresence, publicKeys, entity.key);

  const faq = buildEntityFaqSection(input);
  const next = buildEntityNextSection(input, coPresence, entityFirstChapter(entity));
  return [
    ...buildEntityProfileSections(input),
    ...buildEntityStorySections(input, coPresence),
    ...buildEntityExternalSections(input),
    ...(faq ? [faq] : []),
    ...(next ? [next] : []),
  ];
}

/**
 * Разделы страницы сущности по типу (кроме пары - у неё свой вход с героями ключа): место
 * (`F08-12c`), предмет, понятие и событие (`F08-13c`) - своими сборщиками, герой и прочее -
 * сборщиком героя.
 */
export function buildSectionsOfType(input: WorldEntitySectionsInput): PageSection[] {
  if (input.entity.type === 'place') return buildPlaceSections(input);
  if (isWorldObjectType(input.entity.type)) return buildObjectSections(input);
  return buildEntitySections(input);
}
