import { Fragment, type ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { QuotesBlock, type QuoteItem } from '@/components/common/QuotesBlock/QuotesBlock';
import { sortCharacters, splitParagraphs, themeColorIndex } from '@/lib/book-analysis/format';
import type {
  BookAnalysisCharacter,
  BookAnalysisKeyQuote,
  BookAnalysisQuote,
  BookAnalysisRole,
  BookAnalysisSymbol,
  BookAnalysisTheme,
} from '@/types/api-schema';
import styles from './analysis.module.scss';
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

export function Paragraphs({ text }: { text: string | null | undefined }) {
  return (
    <>
      {splitParagraphs(text).map((p, i) => (
        <p key={i}>{p}</p>
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
  extra,
}: {
  quote: BookAnalysisQuote & { comment?: string | null };
  linker: ChapterLinker;
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
      {quote.comment ? <p className={styles.quoteMeta}>{quote.comment}</p> : null}
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
  chapterNumbers,
  stripLabels,
}: {
  themes: readonly BookAnalysisTheme[];
  linker: ChapterLinker;
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
            <Paragraphs text={theme.interpretation} />
          </div>
          <ThemeStrip
            themeChapters={theme.chapters}
            chapterNumbers={chapterNumbers}
            linker={linker}
            label={stripLabels.strip}
            chaptersLabel={stripLabels.chapters}
          />
          {(theme.quotes ?? []).slice(0, 3).map((q, qi) => (
            <QuoteBlock key={qi} quote={q} linker={linker} />
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
}

export function CharactersList({
  characters,
  themes,
  linker,
  labels,
}: {
  characters: readonly BookAnalysisCharacter[];
  themes: ThemeIndex;
  linker: ChapterLinker;
  labels: CharacterLabels;
}) {
  return (
    <ul className={styles.cards}>
      {sortCharacters(characters).map((c) => (
        <li key={c.key} className={styles.card}>
          <h3 className={styles.cardTitle}>
            {c.name}
            <span className={styles.role}>{labels.roles[c.role]}</span>
          </h3>
          <div className={styles.text}>
            <Paragraphs text={c.description} />
          </div>
          {c.arc && (c.arc.from || c.arc.to) ? (
            <dl className={styles.arc}>
              {c.arc.from ? (
                <Fragment>
                  <dt>{labels.arcFrom}</dt>
                  <dd>{c.arc.from}</dd>
                </Fragment>
              ) : null}
              {c.arc.to ? (
                <Fragment>
                  <dt>{labels.arcTo}</dt>
                  <dd>{c.arc.to}</dd>
                </Fragment>
              ) : null}
            </dl>
          ) : null}
          {c.quote?.text ? <QuoteBlock quote={c.quote} linker={linker} /> : null}
          <ThemeTags keys={c.themeKeys} themes={themes} label={labels.themeTags} />
        </li>
      ))}
    </ul>
  );
}

export function SymbolsList({
  symbols,
  linker,
  chaptersLabel,
}: {
  symbols: readonly BookAnalysisSymbol[];
  linker: ChapterLinker;
  chaptersLabel: string;
}) {
  return (
    <ul className={styles.cards}>
      {symbols.map((s, i) => (
        <li key={`${s.title}-${i}`} className={styles.card}>
          <h3 className={styles.cardTitle}>{s.title}</h3>
          <div className={styles.text}>
            <Paragraphs text={s.interpretation} />
          </div>
          <ChapterList chapters={s.chapters} linker={linker} label={chaptersLabel} />
          {s.quote?.text ? <QuoteBlock quote={s.quote} linker={linker} /> : null}
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
  themeTagsLabel,
}: {
  id: string;
  title: string;
  quotes: readonly BookAnalysisKeyQuote[];
  /** Имя героя по ключу - «кто говорит» текстом (§11). */
  speakers: ReadonlyMap<string, string>;
  themes: ThemeIndex;
  linker: ChapterLinker;
  themeTagsLabel: string;
}) {
  // «Кто говорит» - текстом (§11), ссылкой только глава: имя героя не ведёт в читалку.
  const items: QuoteItem[] = quotes.map((q) => {
    const speaker = q.speakerKey ? speakers.get(q.speakerKey) : undefined;
    const chapter = q.chapter ?? null;
    return {
      text: q.text,
      ...(speaker ? { author: speaker } : {}),
      comment: splitParagraphs(q.interpretation),
      extra: (
        <>
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
}

/**
 * Карточка произведения (§4): таблица только из строк со значением; нет ни одной строки - нет
 * и заголовка раздела (§1.4), кнопки остаются без него.
 */
export function FactsCard({
  id,
  title,
  rows,
  actions,
}: {
  id: string;
  title: string;
  rows: FactRow[];
  actions: ReactNode;
}) {
  if (rows.length === 0) return <>{actions}</>;
  return (
    <Section id={id} title={title}>
      <dl className={styles.facts}>
        {rows.map((row) => (
          <div key={row.label} className={styles.fact}>
            <dt>{row.label}</dt>
            <dd>{row.value}</dd>
          </div>
        ))}
      </dl>
      {actions}
    </Section>
  );
}
