/**
 * Типы для Pages (CMS) endpoints
 *
 * Статические страницы, SEO метаданные
 */

import type { ISODate, PageType, PublicationStatus, SupportedLang, UUID } from './common';

/**
 * SEO данные для создания/обновления (вложенный объект в запросе)
 */
export interface SeoInput {
  metaTitle?: string | null;
  metaDescription?: string | null;
  canonicalUrl?: string | null;
  robots?: string | null;
  ogTitle?: string | null;
  ogDescription?: string | null;
  ogImageUrl?: string | null;
  twitterCard?: string | null;
  twitterTitle?: string | null;
  twitterDescription?: string | null;
}

/**
 * SEO данные в ответе от backend (полная SEO entity)
 */
export interface SeoData {
  id: number;
  metaTitle?: string | null;
  metaDescription?: string | null;
  canonicalUrl?: string | null;
  robots?: string | null;
  ogTitle?: string | null;
  ogDescription?: string | null;
  ogImageUrl?: string | null;
  twitterCard?: string | null;
  twitterTitle?: string | null;
  twitterDescription?: string | null;
  createdAt: ISODate;
  updatedAt: ISODate;
}

/**
 * Ответ с информацией о странице
 */
export interface PageResponse {
  id: UUID;
  slug: string;
  title: string;
  type: PageType;
  content: string;
  language: SupportedLang;
  status: PublicationStatus;
  seoId?: number | null; // Backend возвращает seoId, не seo объект
  seo?: SeoData; // Может быть populate из связи, но не всегда
  createdAt: ISODate;
  updatedAt: ISODate;
}

/**
 * Запрос на создание страницы
 *
 * ВАЖНО: Backend теперь принимает вложенный объект seo (commit 869a248)
 * и автоматически создает/обновляет SEO entity
 */
export interface CreatePageRequest {
  slug: string;
  title: string;
  type: PageType; // Обязательное поле!
  content: string;
  language?: SupportedLang; // Игнорируется backend, берется из :lang в URL
  seo?: SeoInput; // Вложенный объект SEO (опционально)
}

/**
 * Запрос на обновление страницы
 */
export interface UpdatePageRequest {
  slug?: string;
  title?: string;
  type?: PageType;
  content?: string;
  language?: SupportedLang;
  seo?: SeoInput; // Вложенный объект SEO (опционально)
  status?: PublicationStatus;
}

/**
 * Запрос на резолв SEO данных
 */
export interface SeoResolveRequest {
  type: 'book' | 'page' | 'category' | 'tag';
  id: UUID;
}

/**
 * Ответ с резолвнутыми SEO данными
 */
export interface SeoResolveResponse {
  title: string;
  description: string;
  keywords: string[];
  ogImage?: string;
  canonicalUrl: string;
  alternates: Record<SupportedLang, string>;
}
