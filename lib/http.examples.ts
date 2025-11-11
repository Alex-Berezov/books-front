/**
 * HTTP Client Usage Examples
 *
 * This file contains practical examples for developers
 * DO NOT import this file in production code!
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
 * Example 1: Simple GET request
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
 * Example 2: GET with authorization
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
 * Example 3: POST request (login)
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
 * Example 4: PATCH request (profile update)
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
 * Example 5: Paginated request with query parameters
 */
export const examplePaginatedRequest = async (lang: SupportedLang, page: number = 1) => {
  interface Book {
    id: string;
    title: string;
  }

  interface PaginatedBooks {
    data: Book[];
    meta: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  }

  const endpoint = buildUrlWithParams(`/${lang}/books`, {
    page,
    limit: 20,
    type: 'text',
  });

  const response = await httpGet<PaginatedBooks>(endpoint, {
    language: lang,
  });

  console.log(`Page ${response.meta.page} of ${response.meta.totalPages}`);
  console.log('Books:', response.data);
};

/**
 * Example 6: Error handling
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
 * Example 7: Usage in Server Component
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
      // In real code, call notFound() from next/navigation
      console.error('Book not found');
      return null;
    }
    throw error;
  }
};

/**
 * Example 8: Creating a comment
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
 * Example 9: Bookshelf management
 */
export const exampleBookshelf = async (accessToken: string, versionId: string) => {
  // Add to bookshelf
  await httpPost(`/me/bookshelf/${versionId}`, undefined, {
    accessToken,
  });

  // Get bookshelf
  interface BookshelfItem {
    versionId: string;
    addedAt: string;
  }

  const bookshelf = await httpGet<BookshelfItem[]>('/me/bookshelf', {
    accessToken,
  });

  console.log('Bookshelf:', bookshelf);

  // Remove from bookshelf
  await httpDelete(`/me/bookshelf/${versionId}`, {
    accessToken,
  });
};

/**
 * Example 10: Saving reading progress
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
 * Example 11: SEO resolving
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
