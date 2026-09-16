import { httpDeleteAuth, httpGetAuth, httpPatchAuth, httpPostAuth } from '@/lib/http-client';
import type { BookVersionContributor, ContributorRole } from '@/types/contributors';

export interface CreateBookVersionContributorDto {
  personId: string;
  role: ContributorRole;
  roleOtherRu?: string;
  isPrimary?: boolean;
  displayOrder?: number;
  creditedName?: string;
  creditedLanguage?: string;
  contributionNoteRu?: string;
}

export interface UpdateBookVersionContributorDto {
  role?: ContributorRole;
  roleOtherRu?: string;
  isPrimary?: boolean;
  displayOrder?: number;
  creditedName?: string;
  creditedLanguage?: string;
  contributionNoteRu?: string;
}

export const bookVersionContributorsApi = {
  list: async (versionId: string): Promise<BookVersionContributor[]> => {
    return httpGetAuth<BookVersionContributor[]>(`/admin/versions/${versionId}/contributors`);
  },

  add: async (
    versionId: string,
    payload: CreateBookVersionContributorDto
  ): Promise<BookVersionContributor> => {
    return httpPostAuth<BookVersionContributor>(
      `/admin/versions/${versionId}/contributors`,
      payload
    );
  },

  update: async (
    versionId: string,
    contributorId: string,
    payload: UpdateBookVersionContributorDto
  ): Promise<BookVersionContributor> => {
    return httpPatchAuth<BookVersionContributor>(
      `/admin/versions/${versionId}/contributors/${contributorId}`,
      payload
    );
  },

  /**
   * 🔴 `warning` приходит одной веткой: снят основной `AUTHOR`, и авторов у версии
   * не осталось (`books/src/modules/book-version/book-version.service.ts:1572-1583`).
   * Унаследованная строка `BookVersion.author` при этом не меняется, поэтому публичная
   * карточка книги продолжает показывать прежнее имя (`LEGACY-383`).
   */
  remove: async (
    versionId: string,
    contributorId: string
  ): Promise<{ success: boolean; warning?: string }> => {
    return httpDeleteAuth<{ success: boolean; warning?: string }>(
      `/admin/versions/${versionId}/contributors/${contributorId}`
    );
  },

  reorder: async (
    versionId: string,
    contributorIds: string[]
  ): Promise<BookVersionContributor[]> => {
    return httpPostAuth<BookVersionContributor[]>(
      `/admin/versions/${versionId}/contributors/reorder`,
      { contributorIds }
    );
  },
};
