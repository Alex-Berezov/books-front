import { AuthorsSkeleton } from '@/components/public/authors';

/**
 * Состояние загрузки хаба и буквенных страниц под ним: сетка скелетонов вместо
 * карточек. Next показывает его, пока серверный компонент ждёт ответа.
 */
export default function Loading() {
  return <AuthorsSkeleton />;
}
