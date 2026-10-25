import type { FC, ReactNode } from 'react';
import type { DossierData as Data } from '@/types/api-schema';
import styles from './TranslationChunks.module.scss';

const chaptersText = (chapters: number[]): string =>
  chapters.length > 0 ? `chapters ${chapters.join(', ')}` : 'no chapters';

const Section: FC<{ title: string; empty: boolean; children: ReactNode }> = ({
  title,
  empty,
  children,
}) => (
  <>
    <h3 className={styles.subtitle}>{title}</h3>
    {empty ? <p className={styles.muted}>Empty.</p> : children}
  </>
);

/**
 * Досье целиком, только чтение (`product.md` §1, D1): персонажи со связями, обращениями
 * и судьбой, места и термины, повествование, место и время, композиция, хронология, краткое
 * содержание каждой главы, план разделов, голос с приёмами, мотивы.
 */
export const DossierData: FC<{ data: Data }> = ({ data: d }) => (
  <>
    <Section title="Characters" empty={d.characters.length === 0}>
      <ul className={styles.list}>
        {d.characters.map((c) => (
          <li key={c.key}>
            <strong>{c.name}</strong>
            {c.variants.length > 0 && ` (${c.variants.join(', ')})`} — {c.role}, {c.gender}, first
            in chapter {c.firstChapter}. {c.whoIs}
            {c.fate && ` Fate: ${c.fate}`}
            {c.relations.length > 0 && (
              <div>Relations: {c.relations.map((r) => `${r.label} → ${r.to}`).join('; ')}</div>
            )}
            {c.address.length > 0 && (
              <div>Address: {c.address.map((a) => `to ${a.to}: ${a.form}`).join('; ')}</div>
            )}
          </li>
        ))}
      </ul>
    </Section>
    <Section title="Places, objects, terms" empty={d.entities.length === 0}>
      <ul className={styles.list}>
        {d.entities.map((e) => (
          <li key={e.key}>
            <strong>{e.name}</strong> ({e.kind}, first in chapter {e.firstChapter}) — {e.whatIs}
          </li>
        ))}
      </ul>
    </Section>
    <Section title="Narration and setting" empty={false}>
      <p>
        {d.narration.person}, {d.narration.form}. {d.narration.notes}
      </p>
      <p>
        {d.setting.place}; {d.setting.time}.
      </p>
    </Section>
    <Section title="Structure" empty={d.structure.parts.length === 0 && !d.structure.notes}>
      <ul className={styles.list}>
        {d.structure.parts.map((p, i) => (
          <li key={i}>
            {p.title} — {chaptersText(p.chapters)}
          </li>
        ))}
      </ul>
      {d.structure.notes && <p>{d.structure.notes}</p>}
    </Section>
    <Section title="Chronology" empty={d.chronology.length === 0}>
      <ul className={styles.list}>
        {d.chronology.map((c, i) => (
          <li key={i}>
            Chapter {c.chapter}: {c.event}
            {c.orderNote && ` (${c.orderNote})`}
          </li>
        ))}
      </ul>
    </Section>
    <Section title="Chapters" empty={d.chapters.length === 0}>
      <ul className={styles.list}>
        {d.chapters.map((c) => (
          <li key={c.number}>
            <strong>
              {c.number}. {c.title}
            </strong>{' '}
            — {c.summary}
          </li>
        ))}
      </ul>
    </Section>
    <Section title="Summary plan" empty={d.summaryPlan.length === 0}>
      <ul className={styles.list}>
        {d.summaryPlan.map((s) => (
          <li key={s.number}>
            {s.number}. {s.title} ({chaptersText(s.chapters)}) — {s.why}
          </li>
        ))}
      </ul>
    </Section>
    <Section title="Voice" empty={false}>
      <p>
        Pace: {d.voice.pace}. Sentences: {d.voice.sentenceLength}. Lexicon: {d.voice.lexicon}.
        Irony: {d.voice.irony}.
      </p>
      {d.voice.devices.length > 0 && (
        <ul className={styles.list}>
          {d.voice.devices.map((v, i) => (
            <li key={i}>
              {v.name} (chapter {v.chapter}): {v.howShown} Example: {v.example}
            </li>
          ))}
        </ul>
      )}
    </Section>
    <Section title="Motifs" empty={d.motifs.length === 0}>
      <ul className={styles.list}>
        {d.motifs.map((m, i) => (
          <li key={i}>
            {m.image} — {chaptersText(m.chapters)}
          </li>
        ))}
      </ul>
    </Section>
  </>
);
