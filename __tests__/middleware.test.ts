import { describe, it, expect } from 'vitest';
import { config, isPrivateRoute } from '@/middleware';

/**
 * `LEGACY-083`. Проверяются два свойства, вокруг которых запись и написана:
 *
 * 1. контентные маршруты действительно попадают под `matcher` — иначе
 *    нормализация регистра и хоста до публичных страниц не доходит;
 * 2. ни один контентный маршрут не считается личным — расширение охвата без
 *    этого закрывает публичную страницу авторизацией, о чём запись
 *    предупреждает прямо.
 *
 * ⚠️ **Первая версия сверяла список строк `matcher`, и это было бесполезно.**
 * Код-ревью показало, что Next компилирует `matcher` в регистро**зависимую**
 * регулярку, поэтому перечисление `/:lang(...)/book/:path*` не ловило
 * `/en/Book/Slug` — тот самый адрес, ради которого запись заведена. Список
 * строк был «правильным» и при этом не работал. Теперь шаблон компилируется и
 * проверяется на адресах.
 *
 * ⚠️ Вторая ловушка, тоже из ревью: предикат проверяется **экспортированный**,
 * а не его копия рядом с тестом. Копия оставляла тест зелёным при мутации.
 */
const matcherRegExp = new RegExp(`^${config.matcher[0]}$`);
const matched = (path: string) => matcherRegExp.test(path);

describe('middleware matcher: охват (LEGACY-083)', () => {
  it.each([
    '/en/book/hamlet',
    '/en/author/austen',
    '/en/category/fiction',
    '/en/genre/drama',
    '/en/collection/classics',
    '/en/tag/love',
    '/en/catalog',
  ])('контентный маршрут %s проходит через middleware', (path) => {
    expect(matched(path)).toBe(true);
  });

  it.each([
    // 🔴 Ровно те адреса, ради которых запись и заведена: без нормализации они
    // уезжают в API как есть, получают 404 и закрепляются в кэше на 300 секунд.
    '/en/Book/Slug',
    '/EN/book/hamlet',
    '/en/Category/Fiction',
  ])('адрес в неверном регистре %s тоже проходит — иначе его некому исправить', (path) => {
    expect(matched(path)).toBe(true);
  });

  it.each(['/en/categories', '/en/genres', '/en/collections', '/en/tags'])(
    'хаб таксономии %s не забыт — его адрес публикует карта сайта',
    (path) => {
      expect(matched(path)).toBe(true);
    }
  );

  it('catch-all CMS-страниц тоже под охватом', () => {
    expect(matched('/en/some/cms/page')).toBe(true);
  });

  it.each(['/en/read/hamlet', '/en/listen/hamlet', '/en/summary/hamlet', '/en/profile'])(
    'личный маршрут %s из охвата не выпал',
    (path) => {
      expect(matched(path)).toBe(true);
    }
  );

  it.each(['/_next/static/chunk.js', '/api/version', '/favicon.ico', '/robots.txt'])(
    'служебный путь %s исключён — страницами он не обслуживается',
    (path) => {
      expect(matched(path)).toBe(false);
    }
  );
});

describe('isPrivateRoute: якорь на позицию сегмента (LEGACY-083)', () => {
  it.each([
    ['/en/read/hamlet', true],
    ['/ru/listen/voyna-i-mir', true],
    ['/es/summary/quijote', true],
    // Без хвоста — тоже личный: пускать анонима нельзя.
    ['/en/read', true],
    // Регистр не должен решать вопрос доступа, даже если нормализация идёт раньше.
    ['/EN/Read/hamlet', true],
  ])('%s → личный: %s', (path, expected) => {
    expect(isPrivateRoute(path)).toBe(expected);
  });

  it.each([
    // 🔴 Ловушка, о которой предупреждает запись: слово «read» внутри
    // публичного адреса не делает его личным.
    '/en/category/read/',
    '/en/category/read',
    '/ru/tag/listen/',
    '/en/genre/summary',
    '/en/book/how-to-read-books',
    '/en/author/reader-digest',
    '/en/catalog',
  ])('публичный %s личным не считается', (path) => {
    expect(isPrivateRoute(path)).toBe(false);
  });
});
