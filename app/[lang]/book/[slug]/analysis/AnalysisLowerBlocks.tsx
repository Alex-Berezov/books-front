import { hasText, hasTimeline, isSourceItem, isStyleItem } from '@/lib/book-analysis/format';
import { isSafeHref } from '@/lib/utils/safe-href';
import type { LinkSession } from '@/lib/book-world/link-entities';
import type {
  BookAnalysisAdaptation,
  BookAnalysisAdaptationKind,
  BookAnalysisMisreading,
  BookAnalysisSource,
  BookAnalysisStyle,
  BookAnalysisTimelineEvent,
  BookAnalysisTimelineKind,
} from '@/types/api-schema';
import styles from './analysis.module.scss';
import { Paragraphs, QuoteBlock, type ChapterLinker } from './AnalysisBlocks';
import { LinkedText } from '../LinkedText';

/**
 * Блоки низа страницы анализа (F03-3, `product.md` §13-§18, §20). Серверные: весь текст -
 * в HTML ответа (§1.5). Блок без данных страница не вызывает вовсе (§1.4), необязательные
 * поля внутри блока без значения не дают и строки.
 */

/** Контекст (§13): абзацы текста и вертикальная лента - только от трёх событий, в порядке данных. */
export function ContextBlock({
  text,
  timeline,
  timelineTitle,
  kindLabels,
  links,
}: {
  text: string | null | undefined;
  timeline: readonly BookAnalysisTimelineEvent[] | null | undefined;
  links: LinkSession | null;
  timelineTitle: string;
  kindLabels: Record<BookAnalysisTimelineKind, string>;
}) {
  return (
    <>
      {hasText(text) ? (
        <div className={styles.text}>
          <Paragraphs text={text} links={links} />
        </div>
      ) : null}
      {timeline && hasTimeline(timeline) ? (
        <>
          <h3 className={styles.subTitle}>{timelineTitle}</h3>
          <ol className={styles.timeline}>
            {timeline.map((e, i) => (
              <li key={i} className={styles.timelineItem}>
                <span className={styles.timelineYear}>{e.year}</span>
                <span className={styles.timelineKind}>{kindLabels[e.kind]}</span>
                <p className={styles.timelineEvent}>
                  <LinkedText text={e.event} links={links} />
                </p>
              </li>
            ))}
          </ol>
        </>
      ) : null}
    </>
  );
}

/** Стиль и приёмы (§14): приём, как он работает, пример - цитатой с главой (§1.6). */
export function StyleList({
  items,
  linker,
  links,
}: {
  items: readonly BookAnalysisStyle[];
  linker: ChapterLinker;
  links: LinkSession | null;
}) {
  return (
    <ul className={styles.cards}>
      {items.filter(isStyleItem).map((s, i) => (
        <li key={`${s.device}-${i}`} className={styles.card}>
          <h3 className={styles.cardTitle}>{s.device}</h3>
          <div className={styles.text}>
            <Paragraphs text={s.explanation} links={links} />
          </div>
          {s.example?.text ? <QuoteBlock quote={s.example} linker={linker} links={links} /> : null}
        </li>
      ))}
    </ul>
  );
}

/** Экранизации (§16): название, год, вид, отличия от книги; вид `other` метки не получает. */
export function AdaptationsList({
  items,
  kindLabels,
  links,
}: {
  items: readonly BookAnalysisAdaptation[];
  kindLabels: Record<Exclude<BookAnalysisAdaptationKind, 'other'>, string>;
  links: LinkSession | null;
}) {
  return (
    <ul className={styles.cards}>
      {items.map((a, i) => {
        const kind = a.kind === 'other' ? null : kindLabels[a.kind];
        const meta = [a.year ? String(a.year) : null, kind].filter(Boolean).join(' · ');
        return (
          <li key={`${a.title}-${i}`} className={styles.card}>
            <h3 className={styles.cardTitle}>{a.title}</h3>
            {meta ? <p className={styles.cardMeta}>{meta}</p> : null}
            {hasText(a.differences) ? (
              <div className={styles.text}>
                <Paragraphs text={a.differences} links={links} />
              </div>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

/** Частые ошибки понимания (§17): пара «распространённое мнение → как на самом деле». */
export function MisreadingsList({
  items,
  mythLabel,
  truthLabel,
  links,
}: {
  items: readonly BookAnalysisMisreading[];
  mythLabel: string;
  truthLabel: string;
  links: LinkSession | null;
}) {
  return (
    <ul className={styles.cards}>
      {items.map((m, i) => (
        <li key={i} className={styles.card}>
          <dl className={styles.misreading}>
            <dt>{mythLabel}</dt>
            <dd>
              <LinkedText text={m.myth} links={links} />
            </dd>
            <dt>{truthLabel}</dt>
            <dd>
              <Paragraphs text={m.explanation} links={links} />
            </dd>
          </dl>
        </li>
      ))}
    </ul>
  );
}

/** Вопросы для обсуждения (§18): нумерованный список, без ответов. */
export function DiscussionList({
  questions,
  links,
}: {
  questions: readonly string[];
  links: LinkSession | null;
}) {
  return (
    <ol className={styles.questions}>
      {questions.filter(hasText).map((q, i) => (
        <li key={i}>
          <LinkedText text={q} links={links} />
        </li>
      ))}
    </ol>
  );
}

/**
 * Источники (§20): название - ссылкой наружу. Адрес из данных проходит `isSafeHref`
 * (`ui-kit.md`: поле в `href` без проверки не ставится); не прошёл - название текстом.
 */
export function SourcesList({ items }: { items: readonly BookAnalysisSource[] }) {
  return (
    <ul className={styles.sources}>
      {items.filter(isSourceItem).map((s, i) => (
        <li key={`${s.url}-${i}`}>
          {isSafeHref(s.url) ? (
            <a href={s.url} className={styles.textLink} target="_blank" rel="noopener noreferrer">
              {s.title}
            </a>
          ) : (
            s.title
          )}
        </li>
      ))}
    </ul>
  );
}
