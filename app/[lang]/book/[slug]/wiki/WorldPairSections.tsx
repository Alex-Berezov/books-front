import { hasText } from '@/lib/book-analysis/format';
import { fillTemplate, presenceChapters } from '@/lib/book-world/format';
import type { WorldPairMember, WorldPairSectionsInput } from './worldEntityTypes';
import type { PageSection } from '../analysis/PageSections';
import styles from './wiki.module.scss';
import { WORLD_ANCHORS } from './wikiAnchors';
import {
  buildEntityFaqSection,
  buildEntityNextSection,
  buildEntityQuotesSection,
  buildEntityShortSection,
} from './WorldEntityMore';
import analysisStyles from '../analysis/analysis.module.scss';
import { ChapterRef, Paragraphs } from '../analysis/AnalysisBlocks';
import { ThemeStrip } from '../analysis/ThemeStrip';

/**
 * Имя героя пары для таблицы сравнения; нет ни в списке мира, ни в анализе - `undefined`, и таблицы
 * нет: блок без данных не выводится (`product.md` §1 п.5), сырой ключ и «—» читателю не показываются.
 */
const memberName = (member: WorldPairMember): string | undefined => {
  const name = member.person?.name;
  return hasText(name) ? name : undefined;
};

/**
 * Разделы страницы пары героев (`product.md` §6): «Коротко», таблица сравнения с главами,
 * общие главы, что связывает и разводит, цитаты друг о друге, вывод, частые вопросы и ссылки на
 * обоих героев. Раздел без данных не собирается. Общие главы - посчитанное присутствие пары
 * (`mentions.chapters`: главы, где вместе оба героя), своих сцен у пары нет (поле героя, 400).
 */
export function buildPairSections(input: WorldPairSectionsInput): PageSection[] {
  const { entity, strings, chapterNumbers, analysisStrings, linker, textLinks, members, names } =
    input;
  const [first, second] = members;
  const sections: PageSection[] = [];

  const short = buildEntityShortSection(input);
  if (short) sections.push(short);

  const compare = (entity.compare ?? []).filter(
    (row) => hasText(row.feature) && hasText(row.a) && hasText(row.b)
  );
  const firstName = memberName(first);
  const secondName = memberName(second);
  if (compare.length > 0 && firstName !== undefined && secondName !== undefined) {
    sections.push({
      id: WORLD_ANCHORS.compare,
      title: strings.worldPairCompareTitle,
      body: (
        <div className={styles.compareWrap}>
          <table className={styles.compareTable}>
            <thead>
              <tr>
                <th scope="col">{strings.worldPairFeature}</th>
                <th scope="col">{firstName}</th>
                <th scope="col">{secondName}</th>
              </tr>
            </thead>
            <tbody>
              {compare.map((row, i) => (
                <tr key={`${row.feature}-${i}`}>
                  <th scope="row">{row.feature}</th>
                  <td data-label={firstName}>
                    <p>{row.a}</p>
                    <p className={analysisStyles.cardMeta}>
                      <ChapterRef n={row.chapterA} linker={linker} />
                    </p>
                  </td>
                  <td data-label={secondName}>
                    <p>{row.b}</p>
                    <p className={analysisStyles.cardMeta}>
                      <ChapterRef n={row.chapterB} linker={linker} />
                    </p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ),
    });
  }

  const common = presenceChapters(entity.mentions?.chapters, chapterNumbers);
  if (common.length > 0) {
    sections.push({
      id: WORLD_ANCHORS.pairCommon,
      title: strings.worldPairCommonTitle,
      body: (
        <ThemeStrip
          themeChapters={common}
          chapterNumbers={chapterNumbers}
          linker={linker}
          label={fillTemplate(strings.worldPairCommonLabel, { names })}
          chaptersLabel={analysisStrings.analysisChapters}
          colorClassName={styles.presenceColor}
        />
      ),
    });
  }

  const texts = [
    { id: WORLD_ANCHORS.pairBonds, title: strings.worldPairBondsTitle, text: entity.bonds },
    {
      id: WORLD_ANCHORS.pairDifferences,
      title: strings.worldPairDifferencesTitle,
      text: entity.differences,
    },
  ];
  for (const { id, title, text } of texts) {
    if (!hasText(text)) continue;
    sections.push({
      id,
      title,
      body: (
        <div className={analysisStyles.text}>
          <Paragraphs text={text} links={textLinks} />
        </div>
      ),
    });
  }

  const nameOf = (key: string | null | undefined) => {
    const member = members.find((m) => m.key === key);
    return member ? memberName(member) : undefined;
  };
  const quotes = buildEntityQuotesSection(input, strings.worldPairQuotesTitle, (q) => {
    // «Кто сказал → о ком»: имена только героев ключа пары. Нет имени говорящего - без подписи:
    // имя того, о ком цитата, автором не ставится.
    const speaker = nameOf(q.speakerKey);
    const about = nameOf(q.aboutKey);
    return speaker && about ? `${speaker} → ${about}` : speaker;
  });
  if (quotes) sections.push(quotes);

  if (hasText(entity.conclusion)) {
    sections.push({
      id: WORLD_ANCHORS.pairConclusion,
      title: strings.worldPairConclusionTitle,
      body: (
        <div className={analysisStyles.text}>
          <Paragraphs text={entity.conclusion} links={textLinks} />
        </div>
      ),
    });
  }

  const faq = buildEntityFaqSection(input);
  if (faq) sections.push({ ...faq, title: fillTemplate(strings.worldPairFaqTitle, { names }) });

  // Ссылки на обоих героев - карточками «Дальше» (устройство героя), плюс анализ и пересказ.
  const next = buildEntityNextSection(
    input,
    members.map((m) => ({ key: m.key, chapters: [] })),
    null
  );
  if (next) sections.push({ ...next, title: strings.worldPairHeroesTitle });
  return sections;
}
