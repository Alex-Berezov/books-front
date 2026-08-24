import { getAuthorLetters } from '@/api/endpoints/public';
import { SUPPORTED_LANGS, type SupportedLang } from '@/lib/i18n/lang';
import { buildIndexableAlternates } from '@/lib/seo/hreflang-alternates';
import { authorsBasePath } from './authors-href';

/**
 * Указатель каждого языка: буква → сколько под ней авторов.
 *
 * `null` вместо карты — запрос по этому языку не удался.
 */
export type LettersByLang = Map<string, Map<string, number> | null>;

/**
 * Есть ли буква в алфавите языка и стоит ли за ней хоть один автор.
 *
 * `true` — есть и непуста; `false` — буквы в этом языке нет либо она пуста;
 * `null` — выяснить не удалось.
 */
export type LetterAvailability = Map<string, boolean | null>;

/**
 * Указатели всех пяти языков — одним проходом.
 *
 * ⚠️ Пять запросов на весь набор букв, а не пять на каждую букву. Карта сайта
 * перечисляет до тридцати буквенных страниц на язык, и запрашивать соседей
 * заново под каждую из них значило бы сотни запросов на один файл.
 */
export async function loadLettersByLang(): Promise<LettersByLang> {
  const byLang: LettersByLang = new Map();

  await Promise.all(
    SUPPORTED_LANGS.map(async (lang) => {
      try {
        const entries = await getAuthorLetters(lang as SupportedLang);
        byLang.set(lang, new Map(entries.map((entry) => [entry.letter, entry.count])));
      } catch {
        byLang.set(lang, null);
      }
    })
  );

  return byLang;
}

/** Доступность одной буквы во всех языках — из уже собранных указателей. */
export function availabilityFor(letter: string, byLang: LettersByLang): LetterAvailability {
  const availability: LetterAvailability = new Map();

  for (const lang of SUPPORTED_LANGS) {
    const letters = byLang.get(lang);
    availability.set(lang, letters ? (letters.get(letter) ?? 0) > 0 : null);
  }

  return availability;
}

/** Доступность одной буквы во всех языках. Удобная обёртка для страницы. */
export async function loadLetterAvailability(letter: string): Promise<LetterAvailability> {
  return availabilityFor(letter, await loadLettersByLang());
}

/**
 * Языковые альтернативы буквенной страницы.
 *
 * 🔴 Одна функция на страницу и на карту сайта. Раньше это было написано дважды
 * с независимо придуманной семантикой отказа, а `<link rel=alternate>` страницы
 * и `<xhtml:link>` карты для **одного и того же адреса** обязаны совпадать:
 * поисковик расхождению не верит.
 *
 * 🔴 Отказ здесь читается как «альтернативы нет», в отличие от ветки авторов
 * в карте сайта, где он читается как «язык неизвестен, оставим». Разница не
 * в аккуратности, а в цене ошибки: у автора слаг есть на каждом языке, где есть
 * перевод, и лишняя альтернатива ведёт на живую страницу. У букв алфавиты
 * разные — `/es/authors/letter/д` не существует и гарантированно отдаёт 404
 * (`notFound` в маршруте буквы). Hreflang на 404 — не лишняя ссылка, а битый
 * кластер, и он обесценивает весь набор.
 *
 * 🔴 Со второй страницы альтернатив нет вовсе, и это не упрощение.
 * Под `A` в английском может быть шестьдесят авторов (три страницы), а в
 * испанском десять (одна). Заявить `hreflang="es"` на `/es/authors/letter/a?page=3`
 * значит указать на страницу, которая отвечает 200 с пустой сеткой и `noindex`
 * (`shouldNoindexPaginatedPage`), — hreflang на noindex обесценивает весь кластер,
 * а не одну строку. Сколько страниц у буквы в чужом языке, мы не знаем: ответ
 * ручки букв говорит только «кто-то есть». Без этого числа честный ответ —
 * не заявлять ничего. Карта сайта глубже первой страницы и не ходит, так что
 * `<link rel=alternate>` страницы и `<xhtml:link>` карты остаются согласованы.
 */
export function buildLetterAlternates(
  letter: string,
  ownLang: SupportedLang,
  availability: LetterAvailability,
  siteUrl: string,
  page = 1
): Record<string, string> | undefined {
  if (page > 1) return undefined;

  return buildIndexableAlternates(
    SUPPORTED_LANGS.map((lang) => ({
      language: lang,
      slug: letter,
      linkable: lang === ownLang || availability.get(lang) === true,
    })),
    (language, ownLetter) => `${siteUrl}${authorsBasePath(language as SupportedLang, ownLetter)}`
  );
}
