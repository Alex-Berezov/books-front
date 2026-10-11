// @vitest-environment node
import { renderToString } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { ReviewsLoading } from '@/app/[lang]/book/[slug]/BookClientIslands';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { getDefaultLang } from '@/lib/i18n/lang';

const { pathname } = vi.hoisted(() => ({ pathname: { current: '/' } }));

vi.mock('next/navigation', () => ({ usePathname: () => pathname.current }));

/**
 * `T121` (`LEGACY-448`). Заглушка отзывов рендерится и на сервере, и на клиенте. Язык берётся
 * из адреса через `usePathname`: прежний разбор `window.location` на сервере (`window` нет)
 * давал язык по умолчанию, на клиенте — язык адреса, и текст расходился при гидратации.
 * Окружение `node` — ровно серверный рендер, где `window` не существует.
 */
describe('заглушка отзывов страницы книги', () => {
  it('серверный рендер берёт язык из адреса, а не язык по умолчанию', () => {
    pathname.current = '/ru/book/voyna-i-mir';

    expect(renderToString(<ReviewsLoading />)).toContain(getDictionary('ru').book.loadingReviews);
  });

  it('неизвестный язык в адресе — текст языка по умолчанию', () => {
    pathname.current = '/xx/book/hamlet';

    expect(renderToString(<ReviewsLoading />)).toContain(
      getDictionary(getDefaultLang()).book.loadingReviews
    );
  });
});
