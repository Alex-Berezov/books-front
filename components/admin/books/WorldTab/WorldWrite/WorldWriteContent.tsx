'use client';

import type { FC } from 'react';
import {
  ProposalStatus,
  SourceLinks,
  VerifyFactsNote,
  type ProposalContent,
} from '@/components/admin/books/ContentDraft';
import type { WorldWriteItem, WorldWriteValue } from '@/types/api-schema';
import { isExternalBlock, refusalText } from './worldWrite.utils';
import draftStyles from '@/components/admin/books/ContentDraft/ContentDraft.module.scss';

/** Поля содержимого, кроме текста и источников: структура — JSON, как в карточке сущности. */
const STRUCT_FIELDS = [
  'aliases',
  'profile',
  'arc',
  'scenes',
  'relations',
  'quotes',
  'faq',
  'adaptations',
  'compare',
] as const satisfies readonly (keyof WorldWriteValue)[];

/** Поле есть и не пустой список: пустой список не рисуется «[]». */
const filled = (field: unknown): boolean =>
  field !== null &&
  field !== undefined &&
  field !== '' &&
  !(Array.isArray(field) && field.length === 0) &&
  !(typeof field === 'object' && !Array.isArray(field) && Object.keys(field).length === 0);

/** Предложение ничего не пишет в блок: текста нет, списки пусты — «Accept» очистит блок. */
const isEmptyProposal = (value: WorldWriteValue): boolean =>
  !filled(value.text) && STRUCT_FIELDS.every((field) => !filled(value[field]));

/**
 * Блок требует сверки фактов человеком: внешний блок (критика, прототипы, экранизации) или блок
 * с меткой кода `EXTERNAL_CHECK` — её нет среди «Model flags», она здесь (F07 `product.md` §5).
 */
const needsFactCheck = (item: WorldWriteItem): boolean =>
  isExternalBlock(item.block) || item.remarks.some((r) => r.code === 'EXTERNAL_CHECK');

/**
 * Содержимое предложения (`GET content-drafts/:id/items/:index`: в ответ хода оно не идёт), отказ
 * его чтения с «Retry» и «Verify facts»: у записанного внешнего блока — всегда (как у анализа), у
 * предложения — с его содержимым и проверенными источниками. Код проверил, что источник открылся
 * и он про эту книгу, но не что в нём то же самое (F08 `tech.md` §5). Предложение пустыми списками
 * названо прямо: «Accept» очистит блок. Пока содержимое перечитывается, старое не показывается.
 */
export const WorldWriteContent: FC<{
  item: WorldWriteItem;
  content: ProposalContent<WorldWriteValue>;
}> = ({ item, content }) => {
  const { value } = content;
  const written = item.outcome === 'written';
  const verify = needsFactCheck(item) && (written || (item.outcome === 'proposed' && !!value));
  return (
    <>
      <ProposalStatus content={content} refusal={refusalText} />
      {value && isEmptyProposal(value) && (
        <p className={draftStyles.hint}>The proposal empties this block: Accept clears it.</p>
      )}
      {value && filled(value.text) && <pre className={draftStyles.preview}>{value.text}</pre>}
      {value &&
        STRUCT_FIELDS.map((field) =>
          filled(value[field]) ? (
            <pre key={field} className={draftStyles.preview}>
              {JSON.stringify(value[field], null, 2)}
            </pre>
          ) : null
        )}
      {verify && (
        <div>
          <VerifyFactsNote />
          {written ? (
            <p className={draftStyles.hint}>
              The verified sources are saved with the entity: see them in its card.
            </p>
          ) : value?.sources && value.sources.length > 0 ? (
            <>
              <p className={draftStyles.hint}>Verified sources of this proposal:</p>
              <SourceLinks sources={value.sources} />
            </>
          ) : (
            <p className={draftStyles.hint}>No verified sources are attached to this proposal.</p>
          )}
        </div>
      )}
    </>
  );
};
