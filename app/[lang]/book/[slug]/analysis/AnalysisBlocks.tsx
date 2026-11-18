import { Fragment, type ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { QuotesBlock, type QuoteItem } from '@/components/common/QuotesBlock/QuotesBlock';
import {
  hasText,
  sortCharacters,
  splitParagraphs,
  themeColorIndex,
} from '@/lib/book-analysis/format';
import { markLinked, type LinkSession } from '@/lib/book-world/link-entities';
import type {
  BookAnalysisCharacter,
  BookAnalysisKeyQuote,
  BookAnalysisQuote,
  BookAnalysisRole,
  BookAnalysisSymbol,
  BookAnalysisTheme,
} from '@/types/api-schema';
import styles from './analysis.module.scss';
import { LinkedText } from '../LinkedText';
import { ThemeStrip } from './ThemeStrip';

/**
 * Блоки верха страницы анализа (F03-2, `product.md` §4-§8, §11, §12). Серверные: весь текст -
 * в HTML ответа (§1.5). Блок без данных страница не вызывает вовсе (§1.4).
 */

/** Ссылка на главу: номер есть в версии - ссылка в читалку, нет - номер текстом (§1.6). */
export interface ChapterLinker {
  label: (n: number) => string;
  href: (n: number) => string | null;
}

/** `bare` - только номер: в списке под подписью «Главы» слово «Глава» не повторяется (§8). */
export function ChapterRef({
  n,
  linker,
  bare = false,
}: {
  n: number;
  linker: ChapterLinker;
  bare?: boolean;
}) {
  const href = linker.href(n);
  const label = bare ? String(n) : linker.label(n);
  return href ? (
    <Link href={href} className={styles.textLink}>
      {label}
    </Link>
  ) : (
    <span>{label}</span>
  );
}

export function Paragraphs({
  text,
  links,
  linkedKey,
}: {
  text: string | null | undefined;
  /** Сессия ссылок страницы (решение арбитра `F08 | F08-5b` Q9); `null` - без перелинковки. */
  links: LinkSession | null;
  /**
   * Сущность, на которую уже ведёт заголовок карточки: её имя в тексте - не ссылка и слот не тратит
   * (§11 п.1). Отметка - в рендере, то есть в порядке документа, как и само «первое упоминание».
   */
  linkedKey?: string;
}) {
  if (linkedKey) markLinked(links, linkedKey);
  return (
    <>
      {splitParagraphs(text).map((p, i) => (
        <p key={i}>
          <LinkedText text={p} links={links} />
        </p>
      ))}
    </>
  );
}

export function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className={styles.section} aria-labelledby={`${id}-title`}>
      <h2 id={`${id}-title`} className={styles.sectionTitle}>
        {title}
      </h2>
      {children}
    </section>
  );
}

/** Карта ключа темы в её название и номер цвета: одна на карточки тем и метки (§6). */
export type ThemeIndex = Map<string, { title: string; color: number }>;

export function buildThemeIndex(themes: readonly BookAnalysisTheme[]): ThemeIndex {
  return new Map(themes.map((t, i) => [t.key, { title: t.title, color: themeColorIndex(i) }]));
}

function themeClass(color: number): string {
  return styles[`theme${color}`] ?? '';
}

export function ThemeTags({
  keys,
  themes,
  label,
}: {
  keys: readonly string[] | null | undefined;
  themes: ThemeIndex;
  label: string;
}) {
  const known = (keys ?? []).flatMap((key) => {
    const theme = themes.get(key);
    return theme ? [{ key, ...theme }] : [];
  });
  if (known.length === 0) return null;
  return (
    <ul className={styles.tags} aria-label={label}>
      {known.map((t) => (
        <li key={t.key} className={`${styles.tag} ${themeClass(t.color)}`}>
          {t.title}
        </li>
      ))}
    </ul>
  );
}

/** Цитата из книги с главой (§1.6): темы, герои, символы и пример приёма (§14). */
export function QuoteBlock({
  quote,
  linker,
  links,
  extra,
}: {
  quote: BookAnalysisQuote & { comment?: string | null };
  linker: ChapterLinker;
  /** Сессия ссылок страницы: только для толкования `comment`, текст цитаты - как есть (Q13). */
  links: LinkSession | null;
  extra?: ReactNode;
}) {
  const chapter = quote.chapter ?? null;
  return (
    <blockquote className={styles.quote}>
      <p>{quote.text}</p>
      {(chapter !== null || extra) && (
        <footer className={styles.quoteMeta}>
          {extra}
          {chapter !== null && <ChapterRef n={chapter} linker={linker} />}
        </footer>
      )}
      {quote.comment ? (
        <p className={styles.quoteMeta}>
          <LinkedText text={quote.comment} links={links} />
        </p>
      ) : null}
    </blockquote>
  );
}

function ChapterList({
  chapters,
  linker,
  label,
}: {
  chapters: readonly number[] | null | undefined;
  linker: ChapterLinker;
  label: string;
}) {
  const unique = [...new Set(chapters ?? [])];
  if (unique.length === 0) return null;
  return (
    <ul className={styles.chapters} aria-label={label}>
      <li className={styles.chaptersLabel} aria-hidden="true">
        {label}:
      </li>
      {unique.map((n, i) => (
        <li key={n}>
          <ChapterRef n={n} linker={linker} bare />
          {i < unique.length - 1 ? ',' : null}
        </li>
      ))}
    </ul>
  );
}

/** Подписи полосы темы (§9): `aria-label` клеток и слово перед номерами глав. */
export interface ThemeStripLabels {
  strip: string;
  chapters: string;
}

export function ThemesList({
  themes,
  linker,
  links,
  chapterNumbers,
  stripLabels,
}: {
  themes: readonly BookAnalysisTheme[];
  linker: ChapterLinker;
  links: LinkSession | null;
  /** Номера глав версии: по ним полоса «где звучит тема» (F03-3, §9). */
  chapterNumbers: readonly number[];
  stripLabels: ThemeStripLabels;
}) {
  return (
    <ul className={styles.cards}>
      {themes.map((theme, i) => (
        <li
          key={theme.key}
          className={`${styles.card} ${styles.themeCard} ${themeClass(themeColorIndex(i))}`}
        >
          <h3 className={styles.cardTitle}>{theme.title}</h3>
          <div className={styles.text}>
            <Paragraphs text={theme.interpretation} links={links} />
          </div>
          <ThemeStrip
            themeChapters={theme.chapters}
            chapterNumbers={chapterNumbers}
            linker={linker}
            label={stripLabels.strip}
            chaptersLabel={stripLabels.chapters}
          />
          {(theme.quotes ?? []).slice(0, 3).map((q, qi) => (
            <QuoteBlock key={qi} quote={q} linker={linker} links={links} />
          ))}
        </li>
      ))}
    </ul>
  );
}

export interface CharacterLabels {
  roles: Record<BookAnalysisRole, string>;
  arcFrom: string;
  arcTo: string;
  themeTags: string;
  /** «Подробнее о герое» - ссылка на страницу героя в мире книги. */
  more: string;
}

export function CharactersList({
  characters,
  themes,
  linker,
  links,
  labels,
}: {
  characters: readonly BookAnalysisCharacter[];
  themes: ThemeIndex;
  linker: ChapterLinker;
  links: LinkSession | null;
  labels: CharacterLabels;
}) {
  return (
    <ul className={styles.cards}>
      {sortCharacters(characters).map((c) => {
        const pageHref = links?.index.pageHref.get(c.key);
        return (
          <li key={c.key} className={styles.card}>
            <h3 className={styles.cardTitle}>
              {c.name}
              <span className={styles.role}>{labels.roles[c.role]}</span>
            </h3>
            <div className={styles.text}>
              <Paragraphs
                text={c.description}
                links={links}
                linkedKey={pageHref ? c.key : undefined}
              />
            </div>
            {c.arc && (c.arc.from || c.arc.to) ? (
              <dl className={styles.arc}>
                {c.arc.from ? (
                  <Fragment>
                    <dt>{labels.arcFrom}</dt>
                    <dd>
                      <LinkedText text={c.arc.from} links={links} />
                    </dd>
                  </Fragment>
                ) : null}
                {c.arc.to ? (
                  <Fragment>
                    <dt>{labels.arcTo}</dt>
                    <dd>
                      <LinkedText text={c.arc.to} links={links} />
                    </dd>
                  </Fragment>
                ) : null}
              </dl>
            ) : null}
            {c.quote?.text ? <QuoteBlock quote={c.quote} linker={linker} links={links} /> : null}
            <ThemeTags keys={c.themeKeys} themes={themes} label={labels.themeTags} />
            {pageHref ? (
              <p>
                <Link href={pageHref} className={styles.textLink}>
                  {labels.more}
                </Link>
              </p>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

export function SymbolsList({
  symbols,
  linker,
  links,
  chaptersLabel,
}: {
  symbols: readonly BookAnalysisSymbol[];
  linker: ChapterLinker;
  links: LinkSession | null;
  chaptersLabel: string;
}) {
  return (
    <ul className={styles.cards}>
      {symbols.map((s, i) => (
        <li key={`${s.title}-${i}`} className={styles.card}>
          <h3 className={styles.cardTitle}>{s.title}</h3>
          <div className={styles.text}>
            <Paragraphs text={s.interpretation} links={links} />
          </div>
          <ChapterList chapters={s.chapters} linker={linker} label={chaptersLabel} />
          {s.quote?.text ? <QuoteBlock quote={s.quote} linker={linker} links={links} /> : null}
        </li>
      ))}
    </ul>
  );
}

/**
 * Ключевые цитаты (§11) - общий `QuotesBlock` (`ui-kit.md`: второго рендера цитат не заводить):
 * подпись - кто говорит и глава (ссылкой, если глава есть в версии), под цитатой - толкование и
 * метки тем. `id` секции - якорь «Разбор» со страницы книги.
 */
export function KeyQuotesSection({
  id,
  title,
  quotes,
  speakers,
  themes,
  linker,
  links,
  themeTagsLabel,
}: {
  id: string;
  title: string;
  quotes: readonly BookAnalysisKeyQuote[];
  /** Имя героя по ключу - «кто говорит» текстом (§11). */
  speakers: ReadonlyMap<string, string>;
  themes: ThemeIndex;
  linker: ChapterLinker;
  /** Сессия ссылок страницы: толкование со ссылками, текст цитаты и «кто говорит» - текстом (Q13). */
  links: LinkSession | null;
  themeTagsLabel: string;
}) {
  // «Кто говорит» - текстом (§11), ссылкой только глава: имя героя не ведёт в читалку.
  const items: QuoteItem[] = quotes.map((q) => {
    const speaker = q.speakerKey ? speakers.get(q.speakerKey) : undefined;
    const chapter = q.chapter ?? null;
    return {
      text: q.text,
      ...(speaker ? { author: speaker } : {}),
      // Толкование - узлом, а не строками `comment`: строки общего блока ссылок не несут.
      extra: (
        <>
          {hasText(q.interpretation) ? (
            <div className={styles.quoteComment}>
              <Paragraphs text={q.interpretation} links={links} />
            </div>
          ) : null}
          {chapter !== null ? (
            <p className={styles.quoteMeta}>
              <ChapterRef n={chapter} linker={linker} />
            </p>
          ) : null}
          <ThemeTags keys={q.themeKeys} themes={themes} label={themeTagsLabel} />
        </>
      ),
    };
  });
  return <QuotesBlock id={id} title={title} items={items} className={styles.quotesSection} />;
}

export function SpoilerNote({ text }: { text: string }) {
  return (
    <p className={styles.spoiler} role="note">
      <AlertTriangle size={16} aria-hidden="true" />
      {text}
    </p>
  );
}

export interface FactRow {
  label: string;
  value: string;
  /** Значение - текст со ссылками на героев (рассказчик, место действия; Q13). */
  linked?: boolean;
}

/**
 * Карточка произведения (§4): таблица только из строк со значением; нет ни одной строки - нет
 * и заголовка раздела (§1.4), кнопки остаются без него.
 */
export function FactsCard({
  id,
  title,
  rows,
  links,
  actions,
}: {
  id: string;
  title: string;
  rows: FactRow[];
  links: LinkSession | null;
  actions: ReactNode;
}) {
  if (rows.length === 0) return <>{actions}</>;
  return (
    <Section id={id} title={title}>
      <dl className={styles.facts}>
        {rows.map((row) => (
          <div key={row.label} className={styles.fact}>
            <dt>{row.label}</dt>
            <dd>{row.linked ? <LinkedText text={row.value} links={links} /> : row.value}</dd>
          </div>
        ))}
      </dl>
      {actions}
    </Section>
  );
}
