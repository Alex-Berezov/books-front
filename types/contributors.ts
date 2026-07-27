export type ContributorRole =
  | 'AUTHOR'
  | 'TRANSLATOR'
  | 'EDITOR'
  | 'ILLUSTRATOR'
  | 'NARRATOR'
  | 'ADAPTER'
  | 'COMPILER'
  | 'COMMENTATOR'
  | 'INTRODUCTION_AUTHOR'
  | 'AFTERWORD_AUTHOR'
  | 'COVER_ARTIST'
  | 'RIGHTS_HOLDER'
  | 'OTHER';

export type PersonType = 'NATURAL_PERSON' | 'ORGANIZATION' | 'UNKNOWN';

export interface PersonTranslation {
  id: string;
  personId: string;
  language: string;
  slug: string;
  displayName: string;
  biography?: string | null;
  shortDescription?: string | null;
  wikidataUrl?: string | null;
  wikipediaUrl?: string | null;
  photoUrl?: string | null;
}

export interface Person {
  id: string;
  type: PersonType;
  canonicalName: string;
  sortName?: string | null;
  slug?: string | null;
  birthDate?: string | null;
  deathDate?: string | null;
  birthYear?: number | null;
  deathYear?: number | null;
  nationalityCountryCode?: string | null;
  publicDomainFromYear?: number | null;
  wikidataId?: string | null;
  viafId?: string | null;
  isni?: string | null;
  gutenbergAgentId?: string | null;
  notesRu?: string | null;
  createdAt: string;
  updatedAt: string;
  translations?: PersonTranslation[];
}

export interface BookVersionContributor {
  id: string;
  bookVersionId: string;
  personId: string;
  role: ContributorRole;
  roleOtherRu?: string | null;
  displayOrder: number;
  isPrimary: boolean;
  creditedName?: string | null;
  creditedLanguage?: string | null;
  contributionNoteRu?: string | null;
  confidence?: string | null;
  person?: Person;
}

export interface RightsProfileContributor {
  id: string;
  rightsProfileId: string;
  rightsComponentId?: string | null;
  personId?: string | null;
  role: ContributorRole;
  roleOtherRu?: string | null;
  displayName: string;
  canonicalName?: string | null;
  creditedName?: string | null;
  birthYear?: number | null;
  deathYear?: number | null;
  nationalityCountryCode?: string | null;
  wikidataId?: string | null;
  viafId?: string | null;
  isni?: string | null;
  gutenbergAgentId?: string | null;
  creditedLanguage?: string | null;
  publicDomainFromYear?: number | null;
  sourceEvidenceIds?: string[] | null;
  confidence?: string | null;
  notesRu?: string | null;
  person?: Person;
}

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

export interface ContributorListResponse {
  items: Contributor[];
  total: number;
  page: number;
  limit: number;
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

export interface CreatePersonPayload {
  type?: PersonType;
  canonicalName: string;
  sortName?: string;
  slug?: string;
  birthDate?: string;
  deathDate?: string;
  birthYear?: number;
  deathYear?: number;
  nationalityCountryCode?: string;
  publicDomainFromYear?: number;
  wikidataId?: string;
  viafId?: string;
  isni?: string;
  gutenbergAgentId?: string;
  notesRu?: string;
}

export type UpdatePersonPayload = Partial<CreatePersonPayload>;

export interface QueryPersonsParams {
  q?: string;
  role?: ContributorRole;
  type?: PersonType;
  language?: string;
  limit?: number;
  offset?: number;
}
