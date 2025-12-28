import type { UUID, ISODate, PaginationMeta } from './common';

export type MediaType = 'image' | 'video' | 'audio' | 'document';

export interface MediaFile {
  id: UUID;
  url: string;
  filename: string;
  mimeType: string;
  size: number;
  type: MediaType;
  createdAt: ISODate;
  updatedAt: ISODate;
}

export interface GetMediaParams {
  page?: number;
  limit?: number;
  type?: MediaType;
  search?: string;
}

export interface MediaResponse {
  data: MediaFile[];
  meta: PaginationMeta;
}

export interface UploadMediaResponse {
  data: MediaFile;
}
