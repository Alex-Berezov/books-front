/**
 * Кластер hreflang, построенный **только из индексируемых языков**.
 *
 * 🔴 До 09.08.2026 `alternates` собирались из всех переводов подряд: URL попадал
 * в sitemap только если термин линкуем в языке файла, но список альтернатив
 * проверку не проходил вовсе. Термин с пятью книгами на `en` и нулём на `ru` да­вал
 * корректный `/en/...` с `hreflang="ru"` на страницу, отдающую `noindex`
 * (`LEGACY-057`).
 *
 * ⚠️ Google трактует hreflang на noindex-страницу как противоречивый сигнал и
 * может обесценить **весь** кластер альтернатив, а не отбросить одну ссылку. Цена
 * ошибки поэтому не пропорциональна числу плохих языков.
 *
 * Правило вынесено сюда одно на все ветки карты сайта — таксономии и авторы.
 * Починить одну ветку и оставить другую значило бы сохранить тот же дефект под
 * другим именем: расхождение правил и есть то, что мы закрываем.
 */
export type AlternateCandidate = {
  language: string;
  slug: string;
  /** Ответит ли страница этого языка `index`. Решает `isTaxonomyLinkable`/`isAuthorLinkable`. */
  linkable: boolean;
};

/**
 * @returns кластер `{ lang -> url, 'x-default' -> url }` либо `undefined`, если не
 * осталось ни одного индексируемого языка — тогда блок альтернатив не выводится
 * вовсе. Пустой кластер и отсутствие кластера для потребителя не одно и то же.
 */
export function buildIndexableAlternates(
  candidates: AlternateCandidate[],
  href: (language: string, slug: string) => string,
  defaultLang = 'en'
): Record<string, string> | undefined {
  const usable = candidates.filter((c) => c.linkable && c.slug);
  if (usable.length === 0) return undefined;

  const alternates: Record<string, string> = {};
  usable.forEach((c) => {
    alternates[c.language] = href(c.language, c.slug);
  });

  // `x-default` пересчитывается по **отфильтрованному** набору. Раньше он брался
  // из английского перевода независимо от его состояния — то есть у термина,
  // закрытого именно на `en`, канонической альтернативой объявлялась
  // noindex-страница.
  const fallback = usable.find((c) => c.language === defaultLang) ?? usable[0];
  alternates['x-default'] = href(fallback.language, fallback.slug);

  return alternates;
}

/** Перевод термина в том виде, в каком его отдаёт список таксономий. */
export type TermTranslation = {
  language: string;
  slug?: string;
  autoIndexable?: boolean;
  bookCount?: number;
};

/** Редакторские переключатели уровня термина — общие для всех языков. */
export type TermSwitches = {
  isVisible?: boolean;
  indexable?: boolean;
};

/**
 * Переводы термина, приведённые к кандидатам hreflang.
 *
 * 🔴 Линкуемость считается **по переводу**, а не по термину целиком: у hreflang
 * вопрос задаётся про каждый язык отдельно. Переключатели `isVisible`/`indexable`
 * редакторские и общие, а `autoIndexable`/`bookCount` — свои у каждого перевода.
 *
 * Для языка самого файла это даёт тот же ответ, что и `isTaxonomyLinkable(term)`
 * в ветке карты сайта: список отдаётся с `?lang`, и верхнеуровневые
 * `autoIndexable`/`langBookCount` там — значения этого же перевода. Значит
 * self-ссылка кластера не может пропасть у URL, который в карту попал.
 *
 * ⚠️ Функция живёт здесь, а не внутри `app/sitemaps/[filename]/route.ts`, где
 * была написана изначально: в маршруте она недостижима для тестов, и правило
 * оказалось бы единственным непроверяемым звеном контура.
 */
export function toAlternateCandidates(
  term: TermSwitches,
  translations: TermTranslation[],
  isLinkable: (t: {
    isVisible?: boolean;
    indexable?: boolean;
    autoIndexable?: boolean;
    booksCount?: number;
  }) => boolean
): AlternateCandidate[] {
  return translations
    .filter((t) => Boolean(t.slug))
    .map((t) => ({
      language: t.language,
      slug: t.slug as string,
      linkable: isLinkable({
        isVisible: term.isVisible,
        indexable: term.indexable,
        autoIndexable: t.autoIndexable,
        booksCount: t.bookCount,
      }),
    }));
}
