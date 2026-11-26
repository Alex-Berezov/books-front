import type { ReactNode } from 'react';
import { fillTemplate } from '@/lib/book-world/format';
import type { WorldEntitySectionsInput } from './worldEntityTypes';
import { WorldSpoilerGate, type WorldSpoilerGateProps } from './WorldSpoilerGate';

/** Что нужно острову: текстовая версия прогресса, главы версии и подписи (страница сущности и `/wiki`). */
export type WorldSpoilerInput = Pick<
  WorldEntitySectionsInput,
  'progressVersionId' | 'chapterNumbers' | 'strings'
>;

/**
 * Элемент с главой (этап пути, сцена, цитата; сцена места на `/wiki` - решение `F08 | F08-12c` Q4) под спойлер-островом (`F08-10b`, решение `F08 | F08-10b`):
 * сворачивается у читателя, чья текстовая глава этой версии меньше главы элемента. Глава вне
 * `chapterNumbers` версии - «блок без главы» (Q5): элемент отдаётся как есть, без острова. Нет текстовой
 * версии - нет и прогресса чтения: острова нет.
 *
 * Серверный помощник: строки мира `server-only`, в остров уходят уже готовые подписи.
 */
export function withSpoilerGate(
  input: WorldSpoilerInput,
  chapter: number,
  node: ReactNode,
  noticeClassName?: WorldSpoilerGateProps['noticeClassName']
): ReactNode {
  if (!input.progressVersionId || !input.chapterNumbers.includes(chapter)) return node;
  return (
    <WorldSpoilerGate
      versionId={input.progressVersionId}
      chapter={chapter}
      hiddenLabel={fillTemplate(input.strings.worldSpoilerHidden, { chapter })}
      revealLabel={input.strings.worldSpoilerReveal}
      noticeClassName={noticeClassName}
    >
      {node}
    </WorldSpoilerGate>
  );
}
