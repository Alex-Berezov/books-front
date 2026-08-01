import { render, screen, within } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { RightsTabSourceEdition } from '@/components/admin/books/RightsTab/RightsTabSourceEdition';
import { RightsTabVersions } from '@/components/admin/books/RightsTab/RightsTabVersions';
import type { BookRightsDashboardVersionSummary } from '@/types/api-schema/book-rights';
import type { EditionRights, SourceEdition } from '@/types/api-schema/rights-intake';

/**
 * WP-7.4 (R7-01): до этого пакета раздел «Языковые версии» показывал эксплуатационное
 * состояние версий, а прав по языкам не показывал вовсе — показывать было нечего:
 * `EditionRights` не несла языка, а блок `languageAssessments` отчёта не материализовался.
 * Предупреждение о промежуточном переводе не доходило до редактора нигде.
 */

const makeEditionRights = (overrides: Partial<EditionRights> = {}): EditionRights => ({
  id: 'er-en',
  sourceEditionId: 'se-1',
  languageCode: 'en',
  status: 'ALLOWED',
  notesRu: null,
  legalBasisRu: null,
  translationOrigin: 'NOT_APPLICABLE_ORIGINAL',
  translationSourceLanguage: null,
  requiresGeoBlock: false,
  createdAt: '2026-08-01T10:00:00.000Z',
  updatedAt: '2026-08-01T10:00:00.000Z',
  ...overrides,
});

const intermediateRu = makeEditionRights({
  id: 'er-ru',
  languageCode: 'ru',
  status: 'LICENSE_REQUIRED',
  translationOrigin: 'BIBLIARIS_TRANSLATION_FROM_INTERMEDIATE_TRANSLATION',
  translationSourceLanguage: 'fr',
  requiresGeoBlock: true,
});

const makeVersion = (
  overrides: Partial<BookRightsDashboardVersionSummary> = {}
): BookRightsDashboardVersionSummary =>
  ({
    id: 'version-en',
    language: 'en',
    title: 'Pride and Prejudice',
    status: 'published',
    rightsGeoBlockRequired: false,
    rightsGeoBlockConfigured: false,
    rightsRecheckRequired: false,
    rightsStaleDetectedAt: null,
    rightsStaleReasonCode: null,
    ...overrides,
  }) as BookRightsDashboardVersionSummary;

const makeSourceEdition = (editionRights: EditionRights[]): SourceEdition => ({
  id: 'se-1',
  rightsProfileId: 'profile-1',
  provider: 'PROJECT_GUTENBERG',
  externalId: '1342',
  sourceUrl: null,
  sourceTitle: 'Pride and Prejudice',
  sourceLanguage: 'en',
  sourceTextType: 'ORIGINAL_TEXT',
  gutenbergStatus: 'PUBLIC_DOMAIN_US',
  status: 'ALLOWED',
  notesRu: null,
  editionRights,
  createdAt: '2026-08-01T10:00:00.000Z',
  updatedAt: '2026-08-01T10:00:00.000Z',
});

describe('RightsTabVersions (WP-7.4)', () => {
  const versions = [
    makeVersion(),
    makeVersion({ id: 'version-ru', language: 'ru', title: 'Гордость и предубеждение' }),
  ];

  it('shows the legal status of each language next to its version', () => {
    render(
      <RightsTabVersions
        versions={versions}
        currentVersionId="version-en"
        lang="ru"
        editionRights={[makeEditionRights(), intermediateRu]}
      />
    );

    const ruRow = screen.getByText('Гордость и предубеждение').closest('tr');
    expect(ruRow).not.toBeNull();
    expect(within(ruRow as HTMLElement).getByText('LICENSE_REQUIRED')).toBeInTheDocument();
    expect(
      within(ruRow as HTMLElement).getByText(/Перевод Bibliaris через промежуточный/)
    ).toBeInTheDocument();
    expect(within(ruRow as HTMLElement).getByText(/исходник: FR/)).toBeInTheDocument();
  });

  it('warns the editor about an intermediate translation', () => {
    render(
      <RightsTabVersions
        versions={versions}
        currentVersionId="version-en"
        lang="ru"
        editionRights={[makeEditionRights(), intermediateRu]}
      />
    );

    expect(screen.getByText(/Перевод через промежуточный язык \(RU\)/)).toBeInTheDocument();
  });

  it('says the language is not assessed instead of implying it is cleared', () => {
    render(
      <RightsTabVersions
        versions={versions}
        currentVersionId="version-en"
        lang="ru"
        editionRights={[makeEditionRights()]}
      />
    );

    const ruRow = screen.getByText('Гордость и предубеждение').closest('tr');
    expect(within(ruRow as HTMLElement).getByText('Не оценён')).toBeInTheDocument();
    expect(screen.queryByText(/Перевод через промежуточный язык/)).not.toBeInTheDocument();
  });
});

describe('RightsTabSourceEdition (WP-7.4)', () => {
  it('lists rights per language instead of repeating the source edition status', () => {
    render(
      <RightsTabSourceEdition
        sourceEdition={makeSourceEdition([makeEditionRights(), intermediateRu])}
      />
    );

    expect(screen.getByText('Language Rights & Legal Ground')).toBeInTheDocument();
    const ruRow = screen.getByText('RU').closest('tr');
    expect(within(ruRow as HTMLElement).getByText('LICENSE_REQUIRED')).toBeInTheDocument();
    expect(within(ruRow as HTMLElement).getByText('FR')).toBeInTheDocument();
    expect(within(ruRow as HTMLElement).getByText('Требуется')).toBeInTheDocument();
  });

  it('states plainly that the language slice has not been materialized yet', () => {
    render(<RightsTabSourceEdition sourceEdition={makeSourceEdition([])} />);

    expect(screen.getByText(/Языковой срез прав ещё не материализован/)).toBeInTheDocument();
  });
});
