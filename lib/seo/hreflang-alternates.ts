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
