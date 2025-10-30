/**
 * Примеры использования HTTP клиента
 *
 * Этот файл содержит практические примеры для разработчиков
 * НЕ импортируйте этот файл в production код!
 */

import { ApiError } from '@/types/api';
import type { SupportedLang } from '@/lib/i18n/lang';
import {
  httpGet,
  httpPost,
  httpPatch,
  httpDelete,
  buildUrlWithParams,
  buildLangPath,
} from './http';

/**
 * Пример 1: Простой GET запрос
 */
export const exampleSimpleGet = async () => {
  interface Book {
    id: string;
    title: string;
    author: string;
  }

  const books = await httpGet<Book[]>('/en/books');
  console.log('Books:', books);
};

/**
 * Пример 2: GET с авторизацией
 */
export const exampleAuthenticatedGet = async (accessToken: string) => {
  interface User {
    id: string;
    email: string;
    name: string;
  }

  const user = await httpGet<User>('/users/me', {
    accessToken,
  });
  console.log('User:', user);
};

/**
 * Пример 3: POST запрос (логин)
 */
export const exampleLogin = async (email: string, password: string) => {
  interface LoginResponse {
    accessToken: string;
    refreshToken: string;
    user: {
      id: string;
      email: string;
    };
  }

  const response = await httpPost<LoginResponse>('/auth/login', {
    email,
    password,
  });

  console.log('Logged in:', response.user);
  return response.accessToken;
};

/**
 * Пример 4: PATCH запрос (обновление профиля)
 */
export const exampleUpdateProfile = async (accessToken: string) => {
  interface User {
    id: string;
    name: string;
    languagePreference: SupportedLang;
  }

  const updatedUser = await httpPatch<User>(
    '/users/me',
    {
      name: 'New Name',
      languagePreference: 'es',
    },
    {
      accessToken,
    }
  );

  console.log('Updated user:', updatedUser);
};

/**
 * Пример 5: Пагинированный запрос с query параметрами
 */
export const examplePaginatedRequest = async (lang: SupportedLang, page: number = 1) => {
  interface Book {
    id: string;
    title: string;
  }

  interface PaginatedBooks {
    items: Book[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }

  const endpoint = buildUrlWithParams(`/${lang}/books`, {
    page,
    limit: 20,
    type: 'text',
  });

  const response = await httpGet<PaginatedBooks>(endpoint, {
    language: lang,
  });

  console.log(`Page ${response.page} of ${response.totalPages}`);
  console.log('Books:', response.items);
};

/**
 * Пример 6: Обработка ошибок
 */
export const exampleErrorHandling = async () => {
  try {
    await httpGet('/non-existent-endpoint');
  } catch (error) {
    if (error instanceof ApiError) {
      if (error.isNotFound()) {
        console.error('Resource not found');
      } else if (error.isUnauthorized()) {
        console.error('Please login');
      } else if (error.isRateLimited()) {
        console.error('Too many requests, please wait');
      } else if (error.isValidationError()) {
        console.error('Validation errors:', error.details);
      } else {
        console.error('API Error:', error.message);
      }
    } else {
      console.error('Unknown error:', error);
    }
  }
};

/**
 * Пример 7: Использование в Server Component
 */
export const exampleServerComponent = async (lang: SupportedLang, slug: string) => {
  interface BookOverview {
    book: {
      id: string;
      slug: string;
      title: string;
    };
    hasText: boolean;
    hasAudio: boolean;
  }

  const endpoint = buildLangPath(lang, `/books/${slug}/overview`);

  try {
    const bookData = await httpGet<BookOverview>(endpoint, {
      language: lang,
    });

    return bookData;
  } catch (error) {
    if (error instanceof ApiError && error.isNotFound()) {
      // В реальном коде вызовите notFound() из next/navigation
      console.error('Book not found');
      return null;
    }
    throw error;
  }
};

/**
 * Пример 8: Создание комментария
 */
export const exampleCreateComment = async (
  accessToken: string,
  bookVersionId: string,
  text: string
) => {
  interface Comment {
    id: string;
    text: string;
    createdAt: string;
  }

  const comment = await httpPost<Comment>(
    '/comments',
    {
      text,
      bookVersionId,
    },
    {
      accessToken,
    }
  );

  console.log('Comment created:', comment);
  return comment;
};

/**
 * Пример 9: Управление книжной полкой
 */
export const exampleBookshelf = async (accessToken: string, versionId: string) => {
  // Добавить в полку
  await httpPost(`/me/bookshelf/${versionId}`, undefined, {
    accessToken,
  });

  // Получить полку
  interface BookshelfItem {
    versionId: string;
    addedAt: string;
  }

  const bookshelf = await httpGet<BookshelfItem[]>('/me/bookshelf', {
    accessToken,
  });

  console.log('Bookshelf:', bookshelf);

  // Удалить из полки
  await httpDelete(`/me/bookshelf/${versionId}`, {
    accessToken,
  });
};

/**
 * Пример 10: Сохранение прогресса чтения
 */
export const exampleReadingProgress = async (
  accessToken: string,
  versionId: string,
  chapterNumber: number,
  position: number
) => {
  interface Progress {
    versionId: string;
    chapterNumber: number;
    position: number;
    updatedAt: string;
  }

  const progress = await httpPost<Progress>(
    `/me/progress/${versionId}`,
    {
      chapterNumber,
      position,
    },
    {
      accessToken,
    }
  );

  console.log('Progress saved:', progress);
};

/**
 * Пример 11: SEO резолвинг
 */
export const exampleSeoResolve = async (lang: SupportedLang, type: string, id: string) => {
  interface SeoData {
    meta: {
      title?: string;
      description?: string;
      canonicalUrl?: string;
    };
    openGraph: {
      title?: string;
      description?: string;
      imageUrl?: string;
    };
  }

  const endpoint = buildUrlWithParams(`/${lang}/seo/resolve`, {
    type,
    id,
  });

  const seoData = await httpGet<SeoData>(endpoint, {
    language: lang,
  });

  console.log('SEO Data:', seoData);
  return seoData;
};
