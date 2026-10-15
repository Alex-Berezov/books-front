// @vitest-environment node
import { readFileSync, readdirSync } from 'node:fs';
import { resolve, sep } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * 🔴 LEGACY-006, решение владельца 18.09.2026 (вариант C). Публичный адрес автора —
 * это `AuthorTranslation.slug`, и вывести его из отображаемого имени нельзя: слаг бывает
 * транслитерацией («Сунь-цзы» лежит под `sun-czy`), а при коллизии имён — иметь суффикс.
 * Собранный из имени адрес ведёт в 404 или, хуже, на страницу другого автора. Инцидент
 * этого класса уже был: `/ru/author/sun-tzu` против настоящего `sun-czy`.
 *
 * Запрет записан в самом контракте (`types/api-schema/books.ts`, `BookCardModel.authorSlug`:
 * «do NOT generate from display name»), но текстом в комментарии он держался ровно до
 * следующего, кто его не прочитал. Здесь он машинный.
 *
 * Сторож сканирует **исходник**: точки — асинхронный серверный компонент с сетевыми
 * запросами и блоки страницы автора; рендер-тест потребовал бы
 * мокать весь слой данных ради одной строки адреса. Тот же приём, что и в
 * `__tests__/eslintInlineStyles.test.ts` и `__tests__/app/bookCopyrightStatusHidden.test.ts`.
 *
 * ⚠️ Границы сторожа. Он стережёт **отсутствие слагификации** в названных файлах.
 * Того, что слаг доехал с бэкенда и верен, он не проверяет — это делают спеки бэкенда
 * (`books/src/modules/book/book.service.spec.ts`, `seo.service.spec.ts`,
 * `author/author.service.spec.ts`).
 */

/** Цепочка, которой слаг собирался из имени. Пробельный класс пишется врозь, иначе сторож найдёт сам себя. */
const SLUGIFY_CALL = ['.toLowerCase().replace(/', '\\s+', '/g,'].join('');

/**
 * Комментарии снимаются перед проверкой, и это не поблажка, а условие работоспособности:
 * оба файла **объясняют** в докблоках, какая именно цепочка здесь стояла и чем была плоха.
 * Без снятия сторож находил бы собственное объяснение и краснел на исправном коде — то есть
 * запрещал бы описывать дефект там, где его починили.
 */
const stripComments = (source: string): string =>
  source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');

const readRepoCode = (relativePath: string): string =>
  stripComments(readFileSync(resolve(__dirname, '../..', relativePath), 'utf8'));

const readRepoFile = (relativePath: string): string =>
  readFileSync(resolve(__dirname, '../..', relativePath), 'utf8');

describe('LEGACY-006: адрес автора берётся с сервера, а не выводится из имени', () => {
  it('страница книги не собирает слаг автора из имени', () => {
    const source = readRepoCode('app/[lang]/book/[slug]/page.tsx');

    expect(source).not.toContain(SLUGIFY_CALL);
    // Адрес строится из поля ответа, а не из подписи.
    expect(source).toContain('authorSlug');
  });

  // `T94`: выбор адреса автора переехал из `page.tsx` в `authorHref.ts` — сторож идёт следом.
  it('сборка ссылки на автора не выводит слаг из имени', () => {
    const source = readRepoCode('app/[lang]/book/[slug]/authorHref.ts');

    expect(source).not.toContain(SLUGIFY_CALL);
    expect(source).toContain('encodeURIComponent(authorSlug)');
  });

  // F02-1: маппера карточек автора больше нет — книга приходит готовой карточкой со слагом
  // автора с бэкенда. F02-3: страница собрана из серверных блоков — сторож идёт по странице
  // и по **каждому** файлу каталога блоков: новый блок попадает под него сам.
  const authorBlockFiles = readdirSync(resolve(__dirname, '../../components/public/author'), {
    recursive: true,
  })
    .map(String)
    .filter((file) => file.endsWith('.tsx'))
    .map((file) => `components/public/author/${file.split(sep).join('/')}`);

  it('каталог блоков страницы автора не пуст — сторожу есть что читать', () => {
    expect(authorBlockFiles.length).toBeGreaterThanOrEqual(7);
  });

  it.each(['app/[lang]/author/[authorSlug]/page.tsx', ...authorBlockFiles])(
    'страница автора не собирает слаг из имени: %s',
    (file) => {
      const source = readRepoCode(file);

      expect(source).not.toContain(SLUGIFY_CALL);
    }
  );

  it('контракт по-прежнему запрещает выводить слаг из отображаемого имени', () => {
    // Комментарий — не украшение: он единственное место, где сказано, **почему**
    // поле может быть `null` и почему его нельзя досочинить на месте.
    expect(readRepoFile('types/api-schema/books.ts')).toContain(
      'do NOT generate from display name'
    );
  });
});
