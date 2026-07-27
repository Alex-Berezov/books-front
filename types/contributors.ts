export type ContributorRole =
  | 'AUTHOR'
  | 'TRANSLATOR'
  | 'EDITOR'
  | 'ILLUSTRATOR'
  | 'PHOTOGRAPHER'
  | 'INTRODUCTION_AUTHOR'
  | 'ANNOTATION_AUTHOR'
  | 'COMPILER'
  | 'ADAPTER'
  | 'COVER_DESIGNER'
  | 'CARTOGRAPHER'
  | 'OTHER';

export type ContributorIdentityConfidence = 'CONFIRMED' | 'PROBABLE' | 'UNCERTAIN' | 'UNKNOWN';

export interface SourceEditionContributorLink {
  id: string;
  sourceEditionId: string;
  contributorId: string;
  role: ContributorRole;
  creditedName?: string | null;
  evidenceId?: string | null;
  notesRu?: string | null;
  createdAt: string;
}

export interface RightsComponentContributorLink {
  id: string;
  rightsComponentId: string;
  contributorId: string;
  role: ContributorRole;
  creditedName?: string | null;
  notesRu?: string | null;
  createdAt: string;
}

export interface Contributor {
  id: string;
  displayName: string;
  originalName?: string | null;
  birthDate?: string | null;
  deathDate?: string | null;
  birthYear?: number | null;
  deathYear?: number | null;
  nationalityCountry?: string | null;
  pseudonym?: string | null;
  viafId?: string | null;
  locAuthorityId?: string | null;
  otherAuthorityIds?: Record<string, unknown> | null;
  identityConfidence: ContributorIdentityConfidence;
  notesRu?: string | null;
  authorId?: string | null;
  sourceEditionContributors?: SourceEditionContributorLink[];
  rightsComponentContributors?: RightsComponentContributorLink[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateContributorPayload {
  displayName: string;
  originalName?: string;
  birthDate?: string;
  deathDate?: string;
  birthYear?: number;
  deathYear?: number;
  nationalityCountry?: string;
  pseudonym?: string;
  viafId?: string;
  locAuthorityId?: string;
  otherAuthorityIds?: Record<string, unknown>;
  identityConfidence?: ContributorIdentityConfidence;
  notesRu?: string;
  authorId?: string;
}

export type UpdateContributorPayload = Partial<CreateContributorPayload>;

export interface LinkSourceEditionContributorPayload {
  contributorId: string;
  role: ContributorRole;
  creditedName?: string;
  evidenceId?: string;
  notesRu?: string;
}

export interface LinkRightsComponentContributorPayload {
  contributorId: string;
  role: ContributorRole;
  creditedName?: string;
  notesRu?: string;
}

export interface QueryContributorsParams {
  q?: string;
  role?: ContributorRole;
  identityConfidence?: ContributorIdentityConfidence;
  page?: number;
  limit?: number;
}

export interface ContributorListResponse {
  items: Contributor[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
