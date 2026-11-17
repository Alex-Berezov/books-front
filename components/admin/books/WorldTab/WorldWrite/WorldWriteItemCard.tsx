'use client';

import type { FC } from 'react';
import { useWorldWriteProposal, type WorldWriteActions } from '@/api/hooks';
import { BlockItemCard } from '@/components/admin/books/ContentDraft';
import type { SupportedLang } from '@/lib/i18n/lang';
import type { WorldWrite, WorldWriteItem } from '@/types/api-schema';
import {
  blockChangedOf,
  checkOf,
  isRegenerable,
  itemTitle,
  reasonText,
  refusalText,
} from './worldWrite.utils';
import { WorldWriteContent } from './WorldWriteContent';

export interface WorldWriteItemCardProps {
  run: WorldWrite;
  lang: SupportedLang;
  item: WorldWriteItem;
  /** Ход готов: блоки можно принимать, отбрасывать и перегенерировать (иначе сервер ответит 409). */
  ready: boolean;
  /** Действия закрыты: идёт «Accept all» или ход не перечитывается. */
  disabled: boolean;
  actions: Pick<WorldWriteActions, 'accept' | 'discardItem' | 'regenerate' | 'resume'>;
  /** «Accept» или «Discard» этого блока лёг: прежний итог «Accept all» больше не про этот ход. */
  onDecided: () => void;
}

/** Записано сразу (`written`) и предложено (`proposed`) различаются по `outcome` (F08 `tech.md` §5). */
const OUTCOME_TEXT: Partial<Record<WorldWriteItem['outcome'], string>> = {
  written: 'Written to the world at once: the block was empty and the entity is not published yet.',
  proposed: 'Proposal: Accept writes it to the entity, Discard throws it away.',
  waiting: 'The write is not decided yet.',
  accepted: 'Accepted: written to the entity.',
  discarded: 'Discarded.',
};

/** Подсказка у «Regenerate»: заполненный блок меняется только через «Accept». */
const REGEN_HINT =
  'A filled block always comes back as a proposal; only an empty block of an unpublished entity is written at once.';

/**
 * Блок хода «Write World» (F08 `product.md` §17 п.6) на общей карточке блока (`BlockItemCard`):
 * своё — подписи с именем героя, отметка без `EXTERNAL_CHECK`, содержимое с «Verify facts» у внешних,
 * «Regenerate» не у форм имени. Мир после «Accept» перечитывают действия хода (`useWorldWriteActions`).
 */
export const WorldWriteItemCard: FC<WorldWriteItemCardProps> = ({
  run,
  lang,
  item,
  ready,
  disabled,
  actions,
  onDecided,
}) => (
  <BlockItemCard
    runId={run.id}
    lang={lang}
    item={item}
    idPrefix="world-write-item"
    title={itemTitle(run, item)}
    check={checkOf(item)}
    ready={ready}
    disabled={disabled}
    useProposal={useWorldWriteProposal}
    actions={actions}
    regenerable={isRegenerable(item)}
    regenHint={REGEN_HINT}
    outcomeText={OUTCOME_TEXT}
    reasonText={reasonText}
    refusalText={refusalText}
    blockChangedOf={blockChangedOf}
    onDecided={onDecided}
    content={(content) => <WorldWriteContent item={item} content={content} />}
  />
);
