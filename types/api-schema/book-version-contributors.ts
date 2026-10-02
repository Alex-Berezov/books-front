import type { Person } from './persons';
import type { RightsConfidence } from './rights-intake';

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
  confidence?: RightsConfidence | null;
  sourceEvidenceIds?: string[] | null;
  createdAt: string;
  updatedAt: string;
  person?: Person;
}
