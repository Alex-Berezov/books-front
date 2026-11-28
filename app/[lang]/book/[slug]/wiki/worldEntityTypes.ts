import type { ChapterLinker } from '../analysis/AnalysisBlocks';
import type { LinkSession } from '@/lib/book-world/link-entities';
import type { AnalysisStrings } from '@/lib/i18n/analysisStrings';
import type { WorldStrings } from '@/lib/i18n/worldStrings';
import type { BookWorldEntity, BookWorldImage, BookWorldMap } from '@/types/api-schema';

/** Герой версии для ссылок: имя, адрес страницы (только у публичных) и «Коротко» для карточки. */
export interface WorldPerson {
  name: string;
  /** Адрес страницы героя; `null` - страницы нет, имя текстом. */
  href: string | null;
  short?: string | null;
}

/** Иллюстрация героя или места на странице (F08-11c, F08-12c-2): файл, готовые `alt` и подпись, адрес редполитики. */
export interface WorldIllustration {
  image: BookWorldImage;
  alt: string;
  caption: string;
  policyHref: string;
  /** Тип сущности: запасная пропорция картинки без размеров (место - 1200×675, F08-12c-2). */
  entityType: string;
}

export interface WorldEntitySectionsInput {
  entity: BookWorldEntity;
  /** Принятая иллюстрация героя или места (F08-12c-2); `null` - нет (у пары тоже нет). */
  illustration: WorldIllustration | null;
  /** Малая карта реального места с точкой (F08-12d); `null` - нет (у героя и пары тоже нет). */
  map: BookWorldMap | null;
  /**
   * Текстовая версия книги на языке страницы (`versionIds.text`): под ней читалка пишет прогресс,
   * по нему спойлер-остров сворачивает элементы (`F08-10b`). `null` - текста нет, свёртки нет.
   * Не версия мира: та берётся первой версией языка и может оказаться аудио.
   */
  progressVersionId: string | null;
  chapterNumbers: readonly number[];
  strings: WorldStrings;
  analysisStrings: AnalysisStrings;
  linker: ChapterLinker;
  /** Сессия ссылок страницы для текстов (F08-5, решение арбитра Q9); `null` - без перелинковки. */
  textLinks: LinkSession | null;
  /** Герои по ключу: публичные из списка мира и запасные имена из анализа. */
  people: ReadonlyMap<string, WorldPerson>;
  /**
   * Названия тем текущего анализа по ключу (связи предмета, решение арбитра `F08 | F08-13c` Q5);
   * анализа нет - пусто.
   */
  themeTitles: ReadonlyMap<string, string>;
  /** Номера аудиоглав версии: «Слушать» - только на существующую. */
  audioChapters: ReadonlySet<number>;
  /** Адрес плеера на аудиоглаве `n`; `null` - аудио у книги нет. */
  listenHref: ((n: number) => string) | null;
  /**
   * Адрес читалки на главе `n` или `null`, если главы нет в версии; с абзацем `p` - на абзаце сцены
   * (`?chapter=n&p=p`, `F08-10a`).
   */
  readerHref: (n: number, p?: number | null) => string | null;
  /**
   * Публичные пары героя (F08-8c): строкой в «Отношениях», по одной на пару, по ключу пары. Пустой
   * список - пар нет или ни одна не публична.
   */
  pairLinks: readonly WorldPairLink[];
  links: {
    analysis: string | null;
    /** У анализа есть темы: ссылка «Анализ: темы» ведёт на `#themes`, иначе - на анализ без якоря. */
    analysisHasThemes: boolean;
    summary: { href: string; label: string } | null;
  };
}

/** Ссылка героя на публичную пару: ключ пары, адрес и имя «{a} и {b}» в порядке ключа. */
export interface WorldPairLink {
  key: string;
  href: string;
  names: string;
}

/** Герой пары: ключ и данные для ссылки (`null` - имени нет ни в списке мира, ни в анализе). */
export interface WorldPairMember {
  key: string;
  person: WorldPerson | null;
}

/** Вход разделов страницы пары (F08-8c): общий вход страницы сущности плюс герои ключа. */
export interface WorldPairSectionsInput extends WorldEntitySectionsInput {
  /** Герои ключа `{a}--{b}`: первый и второй. */
  members: readonly [WorldPairMember, WorldPairMember];
  /** Имя пары для заголовков: «{a} и {b}» формулой языка. */
  names: string;
}
