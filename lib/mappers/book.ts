import type { BookCardModel, PublicAuthorBook } from '@/types/api-schema';

/**
 * Книга авторской страницы в карточку.
 *
 * Ручка автора собирает книгу своей узкой формой (`PublicAuthorBookDto` — одиннадцать полей,
 * заголовок и обложка уже на верхнем уровне). До 10.09.2026 здесь работал общий маппер
 * из `BookOverview`, и половина его цепочек фолбэков читала поля, которых в ответе нет.
 */
export const toBookCardModelFromAuthorBook = (book: PublicAuthorBook): BookCardModel => ({
  id: book.id,
  slug: book.slug,
  title: book.title,
  author: book.author,
  authorSlug: book.author ? book.author.trim().toLowerCase().replace(/\s+/g, '-') : null,
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
