import { isAbsoluteHttpUrlOrRootPath } from '@/lib/utils/http-url';

/**
 * Ссылка на автора на странице книги.
 *
 * `authorPageUrl` — ручной ввод редактора и потому первый источник. Он проходит то же правило,
 * что и запись (`@IsAbsoluteHttpUrlOrRootPath()` бэкенда, `T94`): абсолютный http(s) — например,
 * Википедия — или путь от корня. Значения, сохранённые до этого правила, проверяются здесь,
 * на выходе: `javascript:` в `href` исполнился бы у читателя, а адрес без схемы дал бы
 * относительную ссылку в никуда (решение арбитра 03.10.2026). Не прошло — ссылка по слагу.
 *
 * ⚠️ Проверка — форма адреса, а не «похоже на внутренний путь автора»: внешняя ссылка
 * редактора законна, и сужение до внутренних путей молча выбросило бы её.
 *
 * Отдельно отсекается `/{lang}/author/` с пустым последним сегментом: админка собирает путь
 * из перевода, которого может не быть, и такой путь победил бы верный слаг.
 *
 * Слаг автора нужен с верхнего уровня ответа (см. комментарий в `page.tsx`). Нет слага —
 * ссылки нет вовсе: ссылка в 404 хуже её отсутствия.
 */
export const resolveAuthorHref = (
  authorPageUrl: string | null | undefined,
  authorSlug: string | null,
  lang: string
): string | null => {
  const manual = authorPageUrl?.trim();
  if (manual && isAbsoluteHttpUrlOrRootPath(manual) && !manual.endsWith('/author/')) {
    return manual;
  }
  return authorSlug ? `/${lang}/author/${encodeURIComponent(authorSlug)}` : null;
};
