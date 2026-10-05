import type { UUID, ISODate, PaginatedResult } from './common';
import type { MediaAsset } from './uploads';

export type MediaType = 'image' | 'video' | 'audio' | 'document';

export interface MediaFile {
  id: UUID;
  url: string;
  filename: string;
  /** `null` — сервер не знает типа содержимого (`MediaAsset.contentType String?`). */
  mimeType: string | null;
  /** `null` — размер неизвестен (`MediaAsset.size Int?`), а не пустой файл. */
  size: number | null;
  type: MediaType;
  createdAt: ISODate;
  updatedAt: ISODate;
}

export interface GetMediaParams {
  page?: number;
  limit?: number;
  /**
   * `GET /media` считает категорию сама (`MediaListQueryDto.type`,
   * `MEDIA_CATEGORIES` в `books/src/modules/media/dto/create-media.dto.ts`) — слово категории
   * шлётся как есть, не MIME-префикс. `document` там — «не image/video/audio», та же
   * категоризация, что в `mapBackendItemToMediaFile` (`api/endpoints/admin/media.ts`, `LEGACY-415`,
   * закрыто 25.09.2026). Расходятся они на строке с `contentType: null`: маппер считает её
   * документом, а фильтр сервера (`NOT startsWith` на `NULL`) её не отдаёт (`LEGACY-183`, T104c).
   * Значение вне `MediaType` отклоняется 400 (`@IsIn`).
   */
  type?: MediaType;
  search?: string;
}

/**
 * Тело `GET /media` как его отдаёт сервер: единая обёртка `{items, pagination}` над той же
 * строкой `MediaAsset`, что отдаёт загрузка (`MediaAssetResponseDto` на обеих ручках,
 * `LEGACY-177`). `totalPages` считает бэкенд, а не фронт: прежний `Math.ceil(total / limit)`
 * при `limit = 0` давал `Infinity`.
 */
export type MediaListResponse = PaginatedResult<MediaAsset>;

/**
 * Ответ `GET /media` после отображения в `MediaFile` — единая обёртка `{items, pagination}`
 * (`LEGACY-177`). До 13.09.2026 эта форма была своей собственной (`{data, meta}`): её строил
 * маппер в `api/endpoints/admin/media.ts`, пока сервер отдавал `{items,total,page,limit}`.
 * Теперь обёртка совпадает с серверной, и маппер переносит `pagination` как есть.
 */
export type MediaResponse = PaginatedResult<MediaFile>;

/**
 * Тело ответа `POST /media/upload`.
 *
 * 🔴 Обёртки `{ data }` здесь нет: обработчик отдаёт сам ассет
 * (`books/src/modules/media/media.controller.ts`). Прежнее объявление описывало
 * несуществующую форму, и чтение `response.data` дало бы `undefined`.
 */
export type UploadMediaResponse = MediaAsset;

/**
 * Ответ `DELETE /media/:id` (`DeleteMediaResponseDto` на бэкенде).
 *
 * 🔴 `storageDeleted: false` означает, что запись помечена удалённой, а объект в хранилище
 * остался сиротой и снимается руками. Это единственный признак расхождения базы с хранилищем:
 * код ответа в обоих случаях 200.
 */
export interface DeleteMediaResponse {
  success: boolean;
  storageDeleted: boolean;
}
