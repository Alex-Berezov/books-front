import type { ReactNode } from 'react';
import type { LegalClientWidget, LegalDocument } from '@/content/legal/types';

export type LegalPageProps = {
  document: LegalDocument;
  /** Клиентские вставки документа; блок без переданной вставки - ошибка рендера, а не пустое место. */
  widgets?: Partial<Record<LegalClientWidget, ReactNode>>;
};
