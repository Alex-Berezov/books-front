'use client';

import type { FC } from 'react';
import {
  ContentDraftBlock,
  type ContentDraftBlockProps,
} from '@/components/admin/books/ContentDraft';
import type { SummaryDraftKind } from '@/types/api-schema';

export interface SummaryDraftProps extends Omit<ContentDraftBlockProps, 'kind' | 'partial'> {
  kind: SummaryDraftKind;
}

/**
 * Заготовка шага Summary из досье (F05-10, `product.md` §5.1-5.2): общая оболочка заготовки,
 * готовые разделы видны и по ходу, и после отказа - они оплачены и годны.
 */
export const SummaryDraft: FC<SummaryDraftProps> = ({ kind, ...props }) => (
  <ContentDraftBlock kind={kind} partial={kind === 'summary_sections'} {...props} />
);
