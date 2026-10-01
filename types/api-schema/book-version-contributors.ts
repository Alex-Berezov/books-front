import type { Person } from './persons';

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
  confidence?: string | null;
  person?: Person;
}
