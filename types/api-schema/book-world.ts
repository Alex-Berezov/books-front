/**
 * Мир книги (F08-1) — `versions/:bookVersionId/world[/:key]`.
 * Зеркало `books/src/modules/book-world/dto/*.ts`: форма блоков героя — `tech.md` §3,
 * контракт — техбриф `F08-1` §3 (`books-app-docs/features/F08-book-wiki/`). Она же JSON импорта.
 * У ответа `null` у поля — поля нет; в теле записи `null`/`[]`/`''` — очистить поле.
 */

import type { BookAnalysisRole } from './book-analysis';
import type { ISODate } from './common';
import type { SupportedLang } from '@/lib/i18n/lang';

/** Тип сущности; запись принимает `character`, `pair` (F08-8c) и `place` (F08-12a), прочие — пачками своего типа. */
export type WorldEntityType = 'character' | 'pair' | 'place' | 'object' | 'term' | 'event';

export type BookWorldRole = BookAnalysisRole;

export interface BookWorldProfile {
  position?: string | null;
  relationToMain?: string | null;
}

export interface BookWorldArcStage {
  title: string;
  text: string;
  chapter: number;
}

export interface BookWorldArc {
  from: string;
  to: string;
  stages?: BookWorldArcStage[] | null;
}

export interface BookWorldScene {
  chapter: number;
  title: string;
  text: string;
  /**
   * Номер абзаца главы с 1 (`?chapter=N&p=K` читалки): бэкенд считает его при чтении - первый абзац
   * с формой имени (`F08-10a`); `null` - формы в главе нет.
   */
  paragraph?: number | null;
}

export interface BookWorldRelation {
  /** Ключ сущности мира этой версии или героя её анализа. */
  to: string;
  label: string;
}

/** Цитата дословно из главы `chapter` этой версии (решение арбитра `F08 | F08-1` R8). */
export interface BookWorldQuote {
  text: string;
  chapter: number;
  /** Кто говорит: герой мира или анализа; обязателен у пары (F08-8c) — герой пары. */
  speakerKey?: string | null;
  /** Только у пары (F08-8c): герой пары, о котором цитата; вместе с `speakerKey` — оба героя пары, разные. */
  aboutKey?: string | null;
  interpretation: string;
}

/**
 * Строка таблицы сравнения пары (F08-8c): признак и как он у первого (`a`) и второго (`b`) героя
 * ключа `{a}--{b}`, каждая сторона — со своей главой версии.
 */
export interface BookWorldCompare {
  feature: string;
  a: string;
  chapterA: number;
  b: string;
  chapterB: number;
}

export interface BookWorldAdaptation {
  title: string;
  year?: number | null;
  actor?: string | null;
  differences: string;
}

export interface BookWorldFaq {
  question: string;
  answer: string;
}

export interface BookWorldSource {
  title: string;
  url: string;
}

export interface BookWorldChapterCount {
  chapter: number;
  /** Вхождений любой формы имени в главе. */
  count: number;
}

export interface BookWorldCoPresence {
  /** Ключ другого героя версии. */
  key: string;
  /** Главы, где есть оба, по возрастанию. */
  chapters: number[];
}

/**
 * Посчитанное присутствие (F08-2, считает бэкенд по тексту глав): главы, где сущность найдена,
 * первая из них, вхождения по главам и совместное присутствие героев (читателю — только публичные
 * соседи). `null` — не посчитано.
 */
export interface BookWorldMentions {
  chapters: number[];
  first: number | null;
  perChapter: BookWorldChapterCount[];
  coPresence: BookWorldCoPresence[];
}

/** Поля героя (`tech.md` §3) — общая часть ответа и тела записи. */
export interface BookWorldCharacterFields {
  aliases: string[] | null;
  short: string | null;
  profile: BookWorldProfile | null;
  appearance: string | null;
  character: string | null;
  arc: BookWorldArc | null;
  scenes: BookWorldScene[] | null;
  relations: BookWorldRelation[] | null;
  quotes: BookWorldQuote[] | null;
  critique: string | null;
  prototypes: string | null;
  adaptations: BookWorldAdaptation[] | null;
  faq: BookWorldFaq[] | null;
  sources: BookWorldSource[] | null;
}

/**
 * Поля пары героев (F08-8c, `tech.md` §3): тело записи и ответ. У героя их нет, у пары нет полей героя
 * (кроме `short`, `quotes`, `faq`). Строки сравнения, которые не сошлись с текстом версии, читателю
 * бэкенд не отдаёт.
 */
export interface BookWorldPairFields {
  compare: BookWorldCompare[] | null;
  bonds: string | null;
  differences: string | null;
  conclusion: string | null;
}

/** Место реальное или вымышленное (F08-12a); точка на карте — только у реального. */
export type WorldPlaceKind = 'real' | 'fictional';

/**
 * Поля места (F08-12a, решение арбитра `F08 | F08-12` Q1): тело записи и ответ. У героя и пары их нет;
 * у места из полей героя есть только `short`, `scenes`, `quotes` (`speakerKey` — герой), `faq` и формы имени.
 * `wikidataId` — только у реального места: координаты бэкенд читает из Wikidata сам, во входе их нет.
 */
export interface BookWorldPlaceFields {
  kind: WorldPlaceKind | null;
  location: string | null;
  significance: string | null;
  description: string | null;
  wikidataId: string | null;
}

/** Проверенная точка реального места: координаты из Wikidata P625 и страница источника (F08-12a). */
export interface BookWorldPoint {
  lat: number;
  lng: number;
  sourceUrl: string;
}

/**
 * Почему у места нет точки (F08-12a); `unavailable` — для текущих номера и названий проверки нет
 * (Wikidata не ответила или проверка ещё не прошла), повторится при записи.
 */
export type WorldGeoReason =
  | 'not_found'
  | 'no_coordinates'
  | 'not_earth'
  | 'out_of_range'
  | 'name_mismatch'
  | 'unavailable';

/** Итог последней проверки координат места — только редактору (F08-12a). */
export interface BookWorldGeoCheck {
  wikidataId: string;
  /** `null` — проверки для текущих номера и названий нет (`reason: 'unavailable'`). */
  checkedAt: ISODate | null;
  /** `null` — точка есть. */
  reason: WorldGeoReason | null;
}

/** Сцена места на общей странице: без текста, только ссылка на главу (F08-12a). */
export interface BookWorldPlaceScene {
  title: string;
  chapter: number;
  paragraph: number | null;
}

/**
 * Место на общей странице `/wiki` — текстовым списком и точкой карты (F08-12a, решение арбитра
 * `F08 | F08-12` Q4): и место без своей страницы (`hasPage: false`), карточкой без ссылки.
 */
export interface BookWorldPlaceCard {
  key: string;
  name: string;
  short: string | null;
  kind: WorldPlaceKind | null;
  location: string | null;
  hasPage: boolean;
  point: BookWorldPoint | null;
  scenes: BookWorldPlaceScene[];
}

/** Форма имени и главы, где она не считается — тёзки внутри одной формы (F08-8a). */
export interface BookWorldChapterExclusion {
  form: string;
  chapters: number[];
}

/** Служебные поля — только редактору (`admin`, `content_manager`); анониму поля нет. */
export interface BookWorldEditor {
  isVisible: boolean;
  /** Публичная страница есть: `readAt` не раньше `autoTextAt`, `isVisible`, ядро (F08-3a, решение арбитра Q3). */
  isListed: boolean;
  readAt: ISODate | null;
  /** Последняя запись текста моделью; `null` — модель текст не писала. */
  autoTextAt: ISODate | null;
  firstPublishedAt: ISODate | null;
  /** Чего не хватает до ядра (`world-core.ts` бэкенда); пусто — ядро есть. */
  missing: string[];
  /** Глав присутствия (F08-2); `null` — ещё не посчитано. */
  mentionChapters: number | null;
  /** Только на странице сущности: формы имени, исключённые из подсчёта (F08-2). */
  aliasExclusions?: string[] | null;
  /** Только на странице сущности: главы, где форма имени не считается (F08-8a). */
  aliasChapterExclusions?: BookWorldChapterExclusion[] | null;
  /**
   * Только на странице сущности: пункты, не сошедшиеся с текстом версии на последнем пересчёте
   * (`quotes.2` — цитаты нет дословно или главы нет; `scenes.0`, `arc.stages.1` — главы нет).
   * В ядро не идут, читателю не показываются.
   */
  stale?: string[];
  /**
   * Только на странице сущности: когда посчитанное присутствие последний раз изменилось. Не признак
   * свежести: пересчёт без изменений его не двигает (Q4) — ждать пересчёта по `recountPending`.
   */
  mentionsAt?: ISODate | null;
  /**
   * Только на странице сущности: у версии стоит пересчёт присутствия и ещё не прошёл
   * (решение арбитра `F08 | F08-2` S5).
   */
  recountPending?: boolean;
  /**
   * Только на странице места (F08-12a): проверка координат для текущих номера и названий (то же
   * правило, что `point`); `null` — место вымышленное, без номера или не место.
   */
  geo?: BookWorldGeoCheck | null;
  /**
   * Только на странице сущности: ТЗ на иллюстрацию этой версии (по-английски, с названием книги
   * и автором; F08-11d-2); `null` — не написано. Читателю не отдаётся.
   */
  imageBrief?: string | null;
  /**
   * Только на странице сущности: ТЗ написано не по текущей «Внешности» или до проверки (F08-11d-2) —
   * его надо перегенерировать; ТЗ нет — `false`.
   */
  imageBriefStale?: boolean;
}

export interface BookWorldEntitySummary {
  key: string;
  type: WorldEntityType;
  name: string;
  role: BookWorldRole | null;
  short: string | null;
  hasCore: boolean;
  isIndexable: boolean;
  /** Первая глава присутствия (F08-3a, колонка `mentionFirst`); `null` — не посчитано или героя нет в текстах. */
  mentionFirst: number | null;
  updatedAt: ISODate;
  editor?: BookWorldEditor;
}

/** Язык кластера hreflang мира книги и слаг версии этого языка (F08-3a). */
export interface BookWorldAlternate {
  language: SupportedLang;
  slug: string;
}

/** Строка списка мира: читателю — ещё формы имени для перелинковки (F08-5a); редактору и на странице сущности forms нет. */
export interface BookWorldListEntity extends BookWorldEntitySummary {
  forms?: string[];
}

export interface BookWorldListResponse {
  language: SupportedLang;
  /** Кластер hreflang страницы; пусто — страница не индексируется (одно правило с картой сайта). */
  alternates: BookWorldAlternate[];
  entities: BookWorldListEntity[];
  /**
   * Места общей страницы (F08-12a): «показывать», «прочитано», рубильник мест на бэкенде (включён
   * с F08-12c); выключенный — пусто. Один и тот же набор редактору и читателю.
   */
  places: BookWorldPlaceCard[];
}

export interface BookWorldEntity
  extends
    BookWorldEntitySummary,
    Omit<BookWorldCharacterFields, 'short'>,
    BookWorldPairFields,
    BookWorldPlaceFields {
  mentions: BookWorldMentions | null;
  /** Только у места (F08-12a): проверенная точка для текущего `wikidataId`; иначе `null`. */
  point: BookWorldPoint | null;
  createdAt: ISODate;
}

export interface BookWorldEntityResponse {
  language: SupportedLang;
  /** Номера глав версии по возрастанию: `chapter` полей — только из этого списка. */
  chapterNumbers: number[];
  entity: BookWorldEntity;
  /** Кластер hreflang страницы сущности; пусто — страница не индексируется. */
  alternates: BookWorldAlternate[];
  /**
   * Принятая иллюстрация сущности (F08-11a): одна на книгу и ключ, общая для всех языков; `null` —
   * нет или ещё не принята. Ожидающая принятия картинка сюда не попадает никогда, редактору тоже.
   */
  image: BookWorldImage | null;
}

/** Иллюстрация сущности: абсолютный адрес исходника и размеры из заголовка файла (F08-11a). */
export interface BookWorldImage {
  url: string;
  width: number | null;
  height: number | null;
}

/** Файл иллюстрации во вкладке World: публичный адрес, размеры из заголовка и id медиа для «Accept» (F08-11a). */
export interface WorldImageFile extends BookWorldImage {
  mediaId: string;
}

/** Иллюстрация героя или места (F08-12c-2) во вкладке World: принятая и ожидающая принятия (F08-11a, без генерации с F08-11d). */
export interface WorldImageState {
  key: string;
  /** Герой `main`/`secondary` или место (F08-12c-2): иллюстрация возможна (с F08-11d только по роли, без условия внешности). */
  allowed: boolean;
  /**
   * Тип и роль допускают иллюстрацию (F08-12a, хвост F08-11b): `false` — «Accept» отвечает
   * 409 `WORLD_IMAGE_NOT_ALLOWED`.
   */
  roleAllowed: boolean;
  /**
   * Ключ занят картинкой сущности другого типа, у которой ещё есть право и живой файл (F08-12c-2,
   * решение `F08 | F08-12c-2` круг 1 Q2): загрузка и «Accept» ответят 409 `WORLD_IMAGE_KEY_CONFLICT`,
   * `accepted` и `pending` тогда `null`. Старый бэкенд поля не шлёт - читается как `false`.
   */
  keyConflict: boolean;
  /** Принятая: её видит сайт. */
  accepted: WorldImageFile | null;
  acceptedAt: string | null;
  /** Ждущая «Accept»: сайт её не показывает никогда. */
  pending: WorldImageFile | null;
}

/** Тело `POST .../image/accept`: какую ожидающую картинку видел администратор. */
export interface AcceptWorldImageRequest {
  pendingMediaId: string;
}

/** Сущность в теле записи. Ключа поля нет — поле не трогается (слияние на сервере). */
export type BookWorldEntityInput = {
  key: string;
  type: WorldEntityType;
  /** Обязательно у новой сущности. */
  name?: string;
  role?: BookWorldRole | null;
  /** Формы имени, исключённые из подсчёта присутствия (ложные совпадения с обычным словом). */
  aliasExclusions?: string[] | null;
  /** Главы, где форма не считается (тёзки, F08-8a): только эта форма, только эти главы. */
  aliasChapterExclusions?: BookWorldChapterExclusion[] | null;
  /**
   * ТЗ на иллюстрацию героя (F08-11d-2): только запись, читателю не отдаётся — редактор видит его
   * в `editor.imageBrief`. Карточка поля не шлёт, ТЗ при её сохранении не меняется.
   */
  imageBrief?: string | null;
} & Partial<BookWorldCharacterFields> &
  Partial<BookWorldPairFields> &
  Partial<BookWorldPlaceFields>;

/** Тело `PUT versions/:id/world`: вся версия; сущности вне тела не трогаются. */
export interface SaveBookWorldRequest {
  language: SupportedLang;
  entities: BookWorldEntityInput[];
}

/** Тело `PUT versions/:id/world/:key`: ключ — в адресе. */
export type SaveBookWorldEntityRequest = { language: SupportedLang } & Omit<
  BookWorldEntityInput,
  'key'
> & { key?: string };

export interface BookWorldWarning {
  code: 'core_incomplete';
  path: string;
  message: string;
}

export interface BookWorldSaveResponse {
  /** Список после записи; `null` на `dryRun`. */
  world: BookWorldListResponse | null;
  entities: { key: string; created: boolean; hasCore: boolean; warnings: BookWorldWarning[] }[];
}

export interface BookWorldEntitySaveResponse {
  /** Сохранённая сущность; `null` на `dryRun`. */
  entity: BookWorldEntity | null;
  hasCore: boolean;
  warnings: BookWorldWarning[];
  /**
   * Сохранение поставило пересчёт присутствия (новая сущность или изменились итоговые формы поиска —
   * имя, формы и исключения вместе — или тип; решение арбитра S7); `false` на `dryRun`.
   */
  recountQueued: boolean;
}

/**
 * Сверка импорта всей версии (решение арбитра `F08 | F08-1` R6, 15.11.2026): самый свежий
 * `updatedAt` и число сущностей, которые видела вкладка; удалённую сущность `updatedAt` не видит,
 * число — видит. Сущностей нет — `expectedAbsent`.
 */
export interface BookWorldExpected {
  expectedUpdatedAt?: string;
  expectedAbsent?: 'true';
  expectedCount?: number;
}

export interface MarkBookWorldReadRequest {
  /** `autoTextAt`, который видела вкладка: сервер отвечает 409 `WORLD_TEXT_CHANGED` при расхождении. */
  autoTextAt: ISODate | null;
}

export interface SetBookWorldFlagsRequest {
  isVisible?: boolean;
  isIndexable?: boolean;
}

/** Сущность в обзоре книги: только публичные (`isListed`). */
export interface BookOverviewWorldKey {
  key: string;
  type: WorldEntityType;
  name: string;
  isIndexable: boolean;
}

/** Сущность в карте сайта мира: `lastmod` — её `updatedAt`, `alternates` — языки, где она публична и индексируется. */
export interface WorldSitemapEntity {
  key: string;
  lastmod: ISODate;
  alternates: BookWorldAlternate[];
}

/** Элемент `GET :lang/world/sitemap`: опубликованная версия со слагом, её `/wiki` и индексируемые сущности. */
export interface WorldSitemapItem {
  slug: string;
  lastmod: ISODate;
  alternates: BookWorldAlternate[];
  entities: WorldSitemapEntity[];
}

/** Событие страницы мира книги (`POST api/world/beacon`, 204; без идентификатора посетителя). */
export type WorldStatEvent =
  | 'view'
  | 'to_reader'
  | 'to_audio'
  | 'to_world'
  | 'to_analysis'
  | 'to_summary'
  | 'engaged';

export interface WorldBeaconRequest {
  bookVersionId: string;
  /** Ключ сущности; нет поля — общая страница `/wiki`. */
  key?: string;
  event: WorldStatEvent;
}

export interface WorldStatsRow {
  bookVersionId: string;
  language: SupportedLang | null;
  slug: string | null;
  /** `null` — общая страница `/wiki`. */
  key: string | null;
  event: WorldStatEvent;
  count: number;
}

export interface WorldStatsResponse {
  from: string;
  to: string;
  isTruncated: boolean;
  items: WorldStatsRow[];
}
