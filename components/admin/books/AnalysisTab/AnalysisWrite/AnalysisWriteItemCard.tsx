'use client';

import type { FC } from 'react';
import { useAnalysisWriteProposal, type AnalysisWriteActions } from '@/api/hooks';
import { BlockItemCard } from '@/components/admin/books/ContentDraft';
import type { SupportedLang } from '@/lib/i18n/lang';
import type { AnalysisWriteItem } from '@/types/api-schema';
import {
  blockChangedOf,
  checkOf,
  isRegenerable,
  itemRefusalText,
  itemTitle,
  mayHaveWritten,
  reasonText,
  refusalText,
} from './analysisWrite.utils';
import { ItemContent, type RunSources, type SavedSources } from './ItemContent';

export interface AnalysisWriteItemCardProps {
  runId: string;
  lang: SupportedLang;
  item: AnalysisWriteItem;
  /** Ход готов: блоки можно принимать, отбрасывать и перегенерировать (иначе сервер ответит 409). */
  ready: boolean;
  /** Действия закрыты: идёт «Accept all» или ход не перечитывается. */
  disabled: boolean;
  /** Источники предложения `sources` этого хода — для «Verify facts» блоков шага 5. */
  runSources: RunSources | null;
  /** Сохранённые источники анализа — для «Verify facts», когда своих у хода нет. */
  saved: SavedSources;
  actions: Pick<AnalysisWriteActions, 'accept' | 'discardItem' | 'regenerate' | 'resume'>;
  /** Анализ мог измениться на сервере: вкладка перечитывает форму и ядро. */
  onBlocksWritten: () => void;
  /** «Accept» или «Discard» этого блока лёг: прежний итог «Accept all» больше не про этот ход. */
  onDecided: () => void;
}

const OUTCOME_TEXT: Partial<Record<AnalysisWriteItem['outcome'], string>> = {
  written: 'Written to the analysis.',
  proposed: 'Proposal: Accept writes it to the analysis, Discard throws it away.',
  waiting: 'The write is not decided yet.',
  accepted: 'Accepted: written to the analysis.',
  discarded: 'Discarded.',
};

/** Подсказка у «Regenerate»: заполненный блок меняется только через «Accept» (U4). */
const REGEN_HINT =
  'A filled block always comes back as a proposal; only an empty block this run owns is written at once.';

/**
 * Блок хода «Write Analysis» (F07 `product.md` §4-§5) на общей карточке блока (`BlockItemCard`):
 * своё — подписи, отметка без `CORE_MISSING`, содержимое с «Verify facts» и источниками у внешних,
 * «Regenerate» не у связей тем и `sources`, отказ с подсказкой при полном списке источников.
 * Отказ, после которого анализ мог измениться (сеть, 5xx, `ANALYSIS_BLOCK_CHANGED`), и «Accept» —
 * форма и ядро перечитываются.
 */
export const AnalysisWriteItemCard: FC<AnalysisWriteItemCardProps> = ({
  runId,
  lang,
  item,
  ready,
  disabled,
  runSources,
  saved,
  actions,
  onBlocksWritten,
  onDecided,
}) => (
  <BlockItemCard
    runId={runId}
    lang={lang}
    item={item}
    idPrefix="analysis-write-item"
    title={itemTitle(item)}
    check={checkOf(item)}
    ready={ready}
    disabled={disabled}
    useProposal={useAnalysisWriteProposal}
    actions={actions}
    regenerable={isRegenerable(item)}
    regenHint={REGEN_HINT}
    outcomeText={OUTCOME_TEXT}
    reasonText={reasonText}
    refusalText={refusalText}
    errorText={(error) => itemRefusalText(error, item)}
    blockChangedOf={blockChangedOf}
    onActionError={(error) => {
      // Сервер мог записать (сеть, 5xx) или блок изменили: форма и ядро перечитываются.
      if (mayHaveWritten(error)) onBlocksWritten();
    }}
    onAccepted={onBlocksWritten}
    onDecided={onDecided}
    content={(content) => (
      <ItemContent item={item} content={content} runSources={runSources} saved={saved} />
    )}
  />
);
