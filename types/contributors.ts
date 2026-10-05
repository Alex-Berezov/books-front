import type { ContributorRole } from './api-schema/book-version-contributors';
import type { PersonType, RightsProfilePersonSummary } from './api-schema/persons';
import type { RightsConfidence } from './api-schema/rights-intake';

export type { Person, PersonTranslation, PersonType } from './api-schema/persons';

/**
 * Участник в составе профиля прав — `RightsProfileContributorDto` бэкенда
 * (`rights-intake/dto/rights-profile-response.dto.ts`). Нет персоны — `person: null`.
 */
export interface RightsProfileContributor {
  id: string;
  rightsProfileId: string;
  rightsComponentId: string | null;
  personId: string | null;
  role: ContributorRole;
  roleOtherRu: string | null;
  displayName: string;
  canonicalName: string | null;
  creditedName: string | null;
  birthYear: number | null;
  deathYear: number | null;
  nationalityCountryCode: string | null;
  wikidataId: string | null;
  viafId: string | null;
  isni: string | null;
  gutenbergAgentId: string | null;
  creditedLanguage: string | null;
  sourceEvidenceIds: string[] | null;
  publicDomainFromYear: number | null;
  confidence: RightsConfidence | null;
  notesRu: string | null;
  person: RightsProfilePersonSummary | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateContributorPayload {
  displayName: string;
  birthDate?: string;
  deathDate?: string;
  birthYear?: number;
  deathYear?: number;
  nationalityCountry?: string;
  publicDomainFromYear?: number;
  wikidataId?: string;
  viafId?: string;
  isni?: string;
  gutenbergAgentId?: string;
  notesRu?: string;
  authorId?: string;
}

export type UpdateContributorPayload = Partial<CreateContributorPayload>;

export interface LinkSourceEditionContributorPayload {
  contributorId: string;
  role: ContributorRole;
  creditedName?: string;
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
