import type { ChapterLinker } from '../analysis/AnalysisBlocks';
import type { AnalysisStrings } from '@/lib/i18n/analysisStrings';
import type { WorldStrings } from '@/lib/i18n/worldStrings';
import type { BookWorldEntity } from '@/types/api-schema';

/** Герой версии для ссылок: имя, адрес страницы (только у публичных) и «Коротко» для карточки. */
export interface WorldPerson {
  name: string;
  /** Адрес страницы героя; `null` - страницы нет, имя текстом. */
  href: string | null;
  short?: string | null;
}

export interface WorldEntitySectionsInput {
  entity: BookWorldEntity;
  chapterNumbers: readonly number[];
  strings: WorldStrings;
  analysisStrings: AnalysisStrings;
  linker: ChapterLinker;
  /** Герои по ключу: публичные из списка мира и запасные имена из анализа. */
  people: ReadonlyMap<string, WorldPerson>;
  /** Номера аудиоглав версии: «Слушать» - только на существующую. */
  audioChapters: ReadonlySet<number>;
  /** Адрес плеера на аудиоглаве `n`; `null` - аудио у книги нет. */
  listenHref: ((n: number) => string) | null;
  /** Адрес читалки на главе `n` или `null`, если главы нет в версии. */
  readerHref: (n: number) => string | null;
  links: {
    analysis: string | null;
    /** У анализа есть темы: ссылка «Анализ: темы» ведёт на `#themes`, иначе - на анализ без якоря. */
    analysisHasThemes: boolean;
    summary: { href: string; label: string } | null;
  };
}
