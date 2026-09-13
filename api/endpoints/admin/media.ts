import { toPaginated } from '@/lib/api/paginated-envelope';
import { httpDeleteAuth, httpGetAuth, httpPostAuth } from '@/lib/http-client';
import type {
  GetMediaParams,
  MediaResponse,
  UploadMediaResponse,
  UUID,
  MediaType,
  MediaFile,
  PaginationInfo,
} from '@/types/api-schema';

// Backend specific types
interface BackendMediaItem {
  id: string;
  url: string;
  key: string;
  contentType: string;
  size: number;
  createdAt: string;
  updatedAt?: string;
  createdById: string;
  isDeleted: boolean;
}

/**
 * Тело `GET /media` как его отдаёт сервер: единая обёртка `{items, pagination}`
 * (`LEGACY-177`, 13.09.2026). `totalPages` теперь считает бэкенд, а не этот файл:
 * прежний `Math.ceil(total / limit)` при `limit = 0` давал `Infinity`.
 */
interface BackendMediaResponse {
  items: BackendMediaItem[];
  pagination: PaginationInfo;
}

const mapBackendItemToMediaFile = (item: BackendMediaItem): MediaFile => {
  const type: MediaType = item.contentType.startsWith('image/')
    ? 'image'
    : item.contentType.startsWith('video/')
      ? 'video'
      : item.contentType.startsWith('audio/')
        ? 'audio'
        : 'document';

  // Extract filename from key (e.g. "covers/.../file.png" -> "file.png")
  const filename = item.key.split('/').pop() || item.key;

  return {
    id: item.id,
    url: item.url,
    filename,
    mimeType: item.contentType,
    size: item.size,
    type,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt || item.createdAt,
  };
};

export const getMediaFiles = async (params: GetMediaParams = {}): Promise<MediaResponse> => {
  const { page = 1, limit = 20, type, search } = params;

  const queryParams = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });

  if (type) {
    queryParams.append('type', type);
  }

  if (search) {
    queryParams.append('search', search);
  }

  const endpoint = `/media?${queryParams.toString()}`;
  const response = await httpGetAuth<BackendMediaResponse>(endpoint);

  // Форма приводится общим хелпером: в окне между выкатами сторон сюда приходит
  // плоский ответ без `pagination` (`LEGACY-177`). Строки перекладываются после
  // приведения — маппер не должен знать, в какой форме они приехали.
  const normalized = toPaginated(response, { page, limit });

  return {
    items: normalized.items.map(mapBackendItemToMediaFile),
    pagination: normalized.pagination,
  };
};

export const uploadMedia = async (formData: FormData): Promise<UploadMediaResponse> => {
  // The backend might return the raw item, so we might need to map it too if we use the response
  // But for now, let's assume the hook invalidates the list and refetches
  return httpPostAuth<UploadMediaResponse>('/media/upload', formData);
};

export const deleteMedia = async (id: UUID): Promise<void> => {
  return httpDeleteAuth(`/media/${id}`);
};
