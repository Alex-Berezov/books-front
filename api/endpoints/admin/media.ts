import { httpDeleteAuth, httpGetAuth, httpPostAuth } from '@/lib/http-client';
import type {
  GetMediaParams,
  MediaResponse,
  UploadMediaResponse,
  UUID,
  MediaType,
  MediaFile,
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

interface BackendMediaResponse {
  items: BackendMediaItem[];
  total: number;
  page: number;
  limit: number;
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

export const getMediaFiles = async (
  params: GetMediaParams = {}
): Promise<MediaResponse> => {
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

  return {
    data: response.items.map(mapBackendItemToMediaFile),
    meta: {
      page: response.page,
      limit: response.limit,
      total: response.total,
      totalPages: Math.ceil(response.total / response.limit),
    },
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
