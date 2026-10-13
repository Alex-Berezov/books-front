import type { SupportedLang } from '@/lib/i18n/lang';
import type { VersionPreview } from '@/types/api-schema';

export interface EditionNotesProps {
  lang: SupportedLang;
  /** Версия книги из уже загруженного обзора. */
  version: VersionPreview;
  /** Год первой публикации активной версии: верхний уровень обзора (`BookOverview.firstPublishedYear`). */
  firstPublishedYear?: number | null;
  /** Показанное название: «Название в оригинале» выводится, только если оно отличается. */
  shownTitle: string;
}
