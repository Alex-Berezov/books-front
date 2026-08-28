import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * 🔴 LEGACY-278. Решение «отдавать картинку оптимизатору или нет» принималось
 * тринадцатью местами рендера по трём разным правилам: два звали предикат, четыре
 * ставили `unoptimized` безусловно, семь не проверяли ничего. Первое — потеря
 * AVIF/WebP навсегда, второе — отложенный отказ: `/_next/image` отвечает 400 на хост
 * вне `remotePatterns`, а места рендера в большинстве серверные, `onError` в них
 * не поставить, и картинка не появляется вовсе.
 *
 * Ни линт, ни типы этого не видят: правил `boundaries`/`no-restricted-imports`
 * в репозитории нет, а `unoptimized` — обычный необязательный проп. Поэтому сторож
 * читает исходники: каждый `<Image>` обязан решать этот вопрос предикатом,
 * и никак иначе.
 */

const REPO_ROOT = resolve(__dirname, '..');
const SCAN_DIRS = ['app', 'components'];
const PREDICATE = 'unoptimized={!isOptimizableHost(';

/** Рабочие копии агентских сессий и артефакты сборки — это вторые копии кода. */
const SKIP_DIRS = new Set(['node_modules', '.next', '.claude', 'coverage']);

function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name) || name.startsWith('.')) continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      out.push(...sourceFiles(full));
      continue;
    }
    if (name.endsWith('.tsx')) out.push(full);
  }
  return out;
}

/**
 * Имя, под которым файл импортировал `next/image`, или `null`, если не импортировал.
 *
 * Имя берётся из импорта, а не считается равным `Image`: в `MediaGrid.tsx` и `MediaList.tsx`
 * уже стоит `Image as ImageIcon` из `lucide-react`, и обратный псевдоним
 * (`import NextImage from 'next/image'`) — самый естественный выход из этого столкновения.
 * Сторож, ищущий буквальное `Image`, такой файл не увидел бы вовсе и остался бы зелёным.
 */
function nextImageLocalName(text: string): string | null {
  // Хвост `, { type ImageProps }` — естественная форма, как только кому-то понадобятся
  // типы пропсов; без него файл выпадал бы из выборки целиком вместе со всеми `<Image>`.
  const match = text.match(/import\s+(\w+)\s*(?:,\s*\{[^}]*\})?\s*from\s+['"]next\/image['"]/);
  return match ? match[1] : null;
}

/**
 * Открывающие теги элемента: от `<Имя` до его СОБСТВЕННОГО `>`, с учётом вложенных
 * фигурных скобок и строк.
 *
 * Резать по первому `/>` нельзя. У непарного `<Image ...></Image>` своей косой нет, срез
 * убегает до `/>` соседнего элемента — и проверка `toContain` проходит за счёт правильного
 * соседа, оставляя незакрытый тег зелёным. Если же следующего `/>` в файле нет вовсе,
 * тег молча выпадает из выборки. Обе дырки пропускают ровно то, ради чего сторож написан.
 */
function openingTags(text: string, localName: string): string[] {
  const tags: string[] = [];
  const opener = new RegExp(`<${localName}\\b`, 'g');
  let match: RegExpExecArray | null;

  while ((match = opener.exec(text)) !== null) {
    let depth = 0;
    let quote: string | null = null;
    let closed = false;

    for (let i = match.index + match[0].length; i < text.length; i += 1) {
      const char = text[i];

      // Комментарий пропускается целиком: апостроф в `{/* don't optimize */}` открыл бы
      // строку, которая никогда не закроется, разбор убежал бы до конца файла, и тег
      // выпал бы из выборки молча — то есть дыра ровно того же класса, что и резка по `/>`.
      if (!quote && char === '/' && (text[i + 1] === '*' || text[i + 1] === '/')) {
        const end = text[i + 1] === '*' ? text.indexOf('*/', i + 2) + 2 : text.indexOf('\n', i + 2);
        if (end <= 1) break;
        i = end - 1;
        continue;
      }

      if (quote) {
        if (char === quote && text[i - 1] !== '\\') quote = null;
        continue;
      }
      if (char === '"' || char === "'" || char === '`') {
        quote = char;
        continue;
      }
      if (char === '{') depth += 1;
      else if (char === '}') depth -= 1;
      else if (char === '>' && depth === 0) {
        tags.push(text.slice(match.index, i + 1));
        closed = true;
        break;
      }
    }

    // Не разобрали — отказ, а не пропуск. Тихо выпавший тег оставляет сторож зелёным
    // на файле, который он не проверил: это и есть тот отказ, от которого он сторожит.
    if (!closed) {
      throw new Error(
        `не удалось разобрать открывающий тег <${localName}> на позиции ${match.index}: ` +
          'сторож не может подтвердить, что этот <Image> зовёт предикат'
      );
    }
  }

  return tags;
}

const rendersWithImage = SCAN_DIRS.flatMap((dir) => sourceFiles(join(REPO_ROOT, dir)))
  .map((path) => ({ path: relative(REPO_ROOT, path), text: readFileSync(path, 'utf8') }))
  .map(({ path, text }) => ({ path, text, localName: nextImageLocalName(text) }))
  // `Image as ImageIcon` из `lucide-react` — это не `next/image`.
  .filter((file): file is typeof file & { localName: string } => file.localName !== null)
  .flatMap(({ path, text, localName }) =>
    openingTags(text, localName).map((tag, index) => ({ path, index, tag }))
  );

describe('каждый <Image> решает вопрос оптимизации одним предикатом', () => {
  it('находит места рендера, а не пустой список', () => {
    // Сторож, зелёный на нуле найденных файлов, не сторожит ничего: переименуют
    // каталог или импорт — и проверка замолчит, оставшись зелёной.
    expect(rendersWithImage.length).toBeGreaterThanOrEqual(13);
  });

  it.each(rendersWithImage.map((r) => [`${r.path} #${r.index + 1}`, r.tag] as const))(
    '%s ставит unoptimized через isOptimizableHost',
    (_label, tag) => {
      // Пробелы схлопываются: prettier при `printWidth: 100` переносит длинный проп
      // на следующую строку (ближе всех к порогу `ProfileClient.tsx` — 94 знака), и
      // сверка по сырой подстроке краснела бы от переформатирования, а не от дефекта.
      expect(tag.replace(/\s+/g, ' ')).toContain(PREDICATE);
    }
  );

  it('нигде не остаётся безусловного unoptimized', () => {
    // Безусловный `unoptimized` — не «безопасный выбор»: он навсегда отдаёт
    // оригинал вместо AVIF/WebP и без ресайза, включая аватары в списках.
    const unconditional = rendersWithImage.filter(
      ({ tag }) => /\bunoptimized\b(?!=)/.test(tag) || tag.includes('unoptimized={true}')
    );

    expect(unconditional.map((r) => `${r.path} #${r.index + 1}`)).toEqual([]);
  });

  it('предикат берётся из lib/utils, а не из доменного модуля', () => {
    // 🔴 До 28.08.2026 предикат жил в `components/public/authors/AuthorCard.tsx`,
    // и главная тянула его из чужого доменного модуля через прямой путь в обход бочки.
    const wrongImport = rendersWithImage
      .map((r) => r.path)
      .filter((path, i, all) => all.indexOf(path) === i)
      .filter((path) =>
        /import \{[^}]*isOptimizableHost[^}]*\} from '(?!@\/lib\/utils\/image-host')/.test(
          readFileSync(join(REPO_ROOT, path), 'utf8')
        )
      );

    expect(wrongImport).toEqual([]);
  });
});
