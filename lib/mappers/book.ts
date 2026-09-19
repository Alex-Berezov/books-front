import type { BookCardModel, PublicAuthorBook } from '@/types/api-schema';

/**
 * Книга авторской страницы в карточку.
 *
 * Ручка автора собирает книгу своей узкой формой (`PublicAuthorBookDto` — одиннадцать полей,
 * заголовок и обложка уже на верхнем уровне). До 10.09.2026 здесь работал общий маппер
 * из `BookOverview`, и половина его цепочек фолбэков читала поля, которых в ответе нет.
 *
 * 🔴 LEGACY-006. `authorSlug` **передаётся**, а не выводится из имени. Раньше здесь стояло
 * `book.author.trim().toLowerCase().replace(/\s+/g, '-')`, и карточка вела на адрес, которого
 * нет: настоящий слаг бывает транслитерацией — «Сунь-цзы» лежит под `sun-czy`, а из имени
 * получалось `сунь-цзы`. Запрет выводить слаг из отображаемого имени записан в самом типе
 * (`types/api-schema/books.ts`, `BookCardModel.authorSlug`).
 *
 * Страница автора знает настоящий слаг из своего адреса, и все книги в этом списке — книги
 * того же автора, поэтому запрашивать его заново незачем.
 */
export const toBookCardModelFromAuthorBook = (
  book: PublicAuthorBook,
  authorSlug: string | null
): BookCardModel => ({
  id: book.id,
  slug: book.slug,
  title: book.title,
  author: book.author,
  authorSlug,
  coverImageUrl: book.coverImageUrl || book.coverUrl || null,
  rating: book.rating ?? null,
  ratingsCount: 0,
  // Статус проверяется, хотя ручка сейчас отдаёт только опубликованное
  // (`books/src/modules/author/author.service.ts:819` — `status: 'published'` в самом запросе):
  // поле `status` в ответе есть, и молчаливая опора на фильтр чужого запроса — это то,
  // как карточка однажды показывает «есть аудио» для черновика.
  hasText: book.versions?.some((v) => v.type === 'text' && v.status === 'published') ?? false,
  hasAudio: book.versions?.some((v) => v.type === 'audio' && v.status === 'published') ?? false,
  publishedAt: null,
  categoryIds: [],
});
