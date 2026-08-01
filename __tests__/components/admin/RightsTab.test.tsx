import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { RightsTab } from '@/components/admin/books/RightsTab/RightsTab';
import { RightsTabEmptyState } from '@/components/admin/books/RightsTab/RightsTabEmptyState';
import type { BookRightsDashboard } from '@/types/api-schema/book-rights';

// Phase 19: RightsTabLawyer reads the session to decide which actions to show.
vi.mock('next-auth/react', () => ({
  useSession: () => ({ data: { user: { roles: ['admin'] } } }),
}));

vi.mock('@/api/hooks/useRightsLawyer', () => ({
  useVersionLawyerReview: () => ({ data: null, isLoading: false }),
  useLawyerReview: () => ({ data: null, isLoading: false, isError: false }),
  useLawyers: () => ({ data: { items: [], total: 0, page: 1, limit: 20 } }),
  useAssignLawyerReview: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useStartLawyerReview: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useDecideLawyerReview: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useWithdrawLawyerReview: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useReopenLawyerReview: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useAddLawyerReviewNote: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useAttachLegalOpinion: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useSatisfyLawyerCondition: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useWaiveLawyerCondition: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useParams: () => ({ lang: 'en', id: 'v1' }),
  useRouter: () => ({
    push: vi.fn(),
    back: vi.fn(),
  }),
}));

// Mock hooks
const mockUseVersionRightsDashboard = vi.fn();
vi.mock('@/api/hooks/useBookVersions', () => ({
  useVersionRightsDashboard: (versionId: string) => mockUseVersionRightsDashboard(versionId),
  usePublishVersion: () => ({ mutate: vi.fn(), isPending: false }),
  useUnpublishVersion: () => ({ mutate: vi.fn(), isPending: false }),
  usePublicationGate: () => ({ data: null, isLoading: false }),
  useUpdateVersionRightsGeoBlock: () => ({ mutate: vi.fn(), isPending: false }),
  useVersionRightsContentHash: () => ({ data: null, isLoading: false }),
  useCheckVersionRightsContentHash: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock('@/api/hooks/useContributors', () => ({
  useContributors: () => ({ data: { items: [] }, isLoading: false }),
  useCreateContributor: () => ({ mutateAsync: vi.fn() }),
  useLinkSourceEditionContributor: () => ({ mutateAsync: vi.fn() }),
  useUnlinkSourceEditionContributor: () => ({ mutateAsync: vi.fn() }),
  useLinkRightsComponentContributor: () => ({ mutateAsync: vi.fn() }),
  useUnlinkRightsComponentContributor: () => ({ mutateAsync: vi.fn() }),
}));

vi.mock('@/api/hooks/useBookVersionContributors', () => ({
  useBookVersionContributors: () => ({ data: [], isLoading: false }),
  useAddBookVersionContributor: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateBookVersionContributor: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useRemoveBookVersionContributor: () => ({ mutate: vi.fn() }),
  useReorderBookVersionContributors: () => ({ mutateAsync: vi.fn() }),
}));

vi.mock('@/api/hooks/useRightsIntakes', () => ({
  useCurrentRightsProfile: () => ({ data: null, isLoading: false }),
  useMaterializeRightsReviewImport: () => ({ mutate: vi.fn(), isPending: false }),
  useRightsIntakeApprovals: () => ({ data: [], isLoading: false }),
  // WP-5.4: чеклист обязательных действий внутри RightsProfilePanel.
  useUpdateRightsAction: () => ({ mutateAsync: vi.fn(), isPending: false, error: null }),
}));

vi.mock('@/components/admin/books/GeoBlockRulesPanel/GeoBlockRulesPanel', () => ({
  GeoBlockRulesPanel: () => <div data-testid="geo-block-rules-panel">Geo-block rules panel</div>,
}));

// Phase 18: the Rights tab renders the recheck panel next to the content-hash block.
vi.mock('@/api/hooks/useRightsRecheck', () => ({
  useVersionRecheck: () => ({
    data: {
      versionId: 'v1',
      blockers: [],
      warnings: [],
      openTasksCount: 0,
      overdueTasksCount: 0,
      blockingTasksCount: 0,
      nextRecheckDueAt: null,
      taskIds: [],
      tasks: [],
      schedule: null,
    },
    isLoading: false,
  }),
  useCompleteRightsRecheckTask: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useDismissRightsRecheckTask: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useSnoozeRightsRecheckTask: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

vi.mock('@/api/hooks/useRightsClaims', () => ({
  useVersionRightsClaims: () => ({
    data: { items: [], total: 0, page: 1, limit: 0 },
    isLoading: false,
  }),
  useRightsClaim: () => ({ data: undefined, isLoading: false }),
  useApplyClaimBlock: () => ({ mutate: vi.fn(), isPending: false }),
  useLiftClaimBlock: () => ({ mutate: vi.fn(), isPending: false }),
  useCreateRightsClaim: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateRightsClaim: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useRecordClaimResponse: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useRecordCounterNotice: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useResolveRightsClaim: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useAddClaimAttachment: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

vi.mock('@/api/hooks/useRightsLicenses', () => ({
  useLinkRightsLicense: () => ({ mutate: vi.fn(), isPending: false }),
  useRevokeRightsLicense: () => ({ mutate: vi.fn(), isPending: false }),
  useCreateRightsLicense: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateRightsLicense: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useVersionLicenseCoverage: () => ({
    data: {
      status: 'COVERED',
      checkedAt: '2026-07-28T00:00:00.000Z',
      requiredCountryCodes: ['ES'],
      coveredCountryCodes: ['ES'],
      uncoveredCountryCodes: [],
      countries: [{ countryCode: 'ES', covered: true, licenseIds: ['lic-1'], issues: [] }],
      licenseIds: ['lic-1'],
      blockers: [],
      warnings: [],
      attributionTextsRu: [],
    },
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  }),
}));

const mockReview = {
  id: 'review-1',
  rightsProfileId: 'profile-1',
  rightsReviewImportId: 'import-1',
  status: 'APPROVED',
  reviewerType: 'HUMAN',
  schemaVersion: '1.0',
  overallStatus: 'APPROVED',
  publicationGate: 'ALLOW',
  confidence: 'HIGH',
  summaryRu: 'Approved by human reviewer',
  conclusionRu: 'Ready for publication',
  reasoningRu: null,
  nextReviewAt: null,
  approvedByUserId: 'user-1',
  approvedByUser: null,
  approvedAt: '2026-07-26T10:00:00Z',
  approvalNotesRu: null,
  rejectedByUserId: null,
  rejectedByUser: null,
  rejectedAt: null,
  rejectionReasonRu: null,
  createdAt: '2026-07-26T10:00:00Z',
  updatedAt: '2026-07-26T10:00:00Z',
};

const mockDashboard: BookRightsDashboard = {
  book: {
    id: 'b1',
    slug: 'pride-and-prejudice',
    rightsIntakeId: 'intake-1',
    currentRightsProfileId: 'profile-1',
    approvedRightsReviewId: 'review-1',
    rightsCreatedAt: '2026-07-26T10:00:00.000Z',
  },
  currentVersion: {
    id: 'v1',
    language: 'en',
    type: 'text',
    status: 'published',
    title: 'Pride and Prejudice (EN)',
    rightsProfileId: 'profile-1',
    approvedRightsReviewId: 'review-1',
    rightsStatus: 'APPROVED',
    rightsGeoBlockRequired: true,
    rightsGeoBlockConfigured: true,
    rightsGeoBlockConfiguredAt: '2026-07-26T10:00:00.000Z',
    rightsGeoBlockNotesRu: 'US allowed, GB blocked',
    rightsContentHash: 'hash123',
    rightsContentHashAlgorithmVersion: 'v1',
    rightsContentHashCalculatedAt: '2026-07-26T10:00:00.000Z',
    rightsRecheckRequired: false,
    rightsStaleDetectedAt: null,
    rightsStaleReasonCode: null,
    rightsStaleReasonRu: null,
  },
  versions: [
    {
      id: 'v1',
      language: 'en',
      type: 'text',
      status: 'published',
      title: 'Pride and Prejudice (EN)',
      rightsProfileId: 'profile-1',
      approvedRightsReviewId: 'review-1',
      rightsStatus: 'APPROVED',
      rightsGeoBlockRequired: true,
      rightsGeoBlockConfigured: true,
      rightsRecheckRequired: false,
    },
    {
      id: 'v2',
      language: 'es',
      type: 'text',
      status: 'draft',
      title: 'Orgullo y prejuicio (ES)',
      rightsProfileId: 'profile-1',
      approvedRightsReviewId: 'review-1',
      rightsStatus: 'APPROVED',
      rightsGeoBlockRequired: true,
      rightsGeoBlockConfigured: false,
      rightsRecheckRequired: true,
    },
  ],
  intake: {
    id: 'intake-1',
    candidateTitle: 'Pride and Prejudice',
    candidateAuthor: 'Jane Austen',
    originalTitle: 'Pride and Prejudice',
    originalLanguage: 'en',
    authorBirthYear: 1775,
    authorDeathYear: 1817,
    sourceProvider: 'PROJECT_GUTENBERG',
    sourceExternalId: '1342',
    sourceUrl: 'https://www.gutenberg.org/ebooks/1342',
    sourceTitle: 'Pride and Prejudice',
    sourceLanguage: 'en',
    sourceTextType: 'ORIGINAL_TEXT',
    targetLanguages: ['en', 'es'],
    targetCountryCodes: ['US', 'GB'],
    plannedContentTypes: ['TEXT'],
    plannedComponents: ['ORIGINAL_TEXT'],
    notesRu: 'Note',
    workflowStatus: 'BOOK_CREATED',
    createdByUserId: 'user-1',
    approvedReviewId: 'review-1',
    createdBookId: 'b1',
    archivedAt: null,
    createdAt: '2026-07-26T10:00:00Z',
    updatedAt: '2026-07-26T10:00:00Z',
  },
  currentProfile: {
    id: 'profile-1',
    rightsIntakeId: 'intake-1',
    currentReviewImportId: 'import-1',
    status: 'ACTIVE',
    isCurrent: true,
    overallStatus: 'APPROVED',
    publicationGate: 'ALLOW',
    confidence: 'HIGH',
    summaryRu: 'Public Domain in US',
    conclusionRu: 'Full clearance granted',
    reasoningRu: null,
    nextReviewAt: null,
    reviews: [mockReview],
    supersededAt: null,
    archivedAt: null,
    createdAt: '2026-07-26T10:00:00Z',
    updatedAt: '2026-07-26T10:00:00Z',
    sourceEdition: {
      id: 'source-1',
      rightsProfileId: 'profile-1',
      provider: 'PROJECT_GUTENBERG',
      externalId: '1342',
      sourceUrl: 'https://www.gutenberg.org/ebooks/1342',
      sourceTitle: 'Pride and Prejudice',
      sourceLanguage: 'en',
      sourceTextType: 'ORIGINAL_TEXT',
      gutenbergStatus: 'PUBLIC_DOMAIN_US',
      status: 'VERIFIED',
      notesRu: null,
      // WP-7.1: права издания — запись на язык.
      editionRights: [
        {
          id: 'ed-rights-en',
          sourceEditionId: 'source-1',
          languageCode: 'en',
          status: 'ALLOWED',
          notesRu: 'Free to distribute',
          legalBasisRu: 'Author died > 70 yrs ago',
          translationOrigin: 'NOT_APPLICABLE_ORIGINAL',
          translationSourceLanguage: null,
          requiresGeoBlock: false,
          createdAt: '2026-07-26T10:00:00Z',
          updatedAt: '2026-07-26T10:00:00Z',
        },
        {
          id: 'ed-rights-ru',
          sourceEditionId: 'source-1',
          languageCode: 'ru',
          status: 'LICENSE_REQUIRED',
          notesRu: 'Перевод сделан с французского перевода',
          legalBasisRu: null,
          translationOrigin: 'BIBLIARIS_TRANSLATION_FROM_INTERMEDIATE_TRANSLATION',
          translationSourceLanguage: 'fr',
          requiresGeoBlock: true,
          createdAt: '2026-07-26T10:00:00Z',
          updatedAt: '2026-07-26T10:00:00Z',
        },
      ],
      createdAt: '2026-07-26T10:00:00Z',
      updatedAt: '2026-07-26T10:00:00Z',
    },
    territoryDecisions: [
      {
        id: 't-1',
        rightsProfileId: 'profile-1',
        countryCode: 'US',
        accessPolicy: 'ALLOW',
        finalStatus: 'PUBLIC_DOMAIN',
        geoBlockRequired: false,
        geoBlockScope: null,
        reasonRu: 'Public domain in US',
        legalBasisRu: 'Life + 70',
        confidence: 'HIGH',
        nextReviewAt: null,
        createdAt: '2026-07-26T10:00:00Z',
        updatedAt: '2026-07-26T10:00:00Z',
      },
      {
        id: 't-2',
        rightsProfileId: 'profile-1',
        countryCode: 'GB',
        accessPolicy: 'BLOCK',
        finalStatus: 'BLOCKED',
        geoBlockRequired: true,
        geoBlockScope: 'COUNTRY_WIDE',
        reasonRu: 'Copyrighted in UK',
        legalBasisRu: 'UK term rule',
        confidence: 'HIGH',
        nextReviewAt: null,
        createdAt: '2026-07-26T10:00:00Z',
        updatedAt: '2026-07-26T10:00:00Z',
      },
    ],
    regionalTerritorySummary: [
      {
        regionCode: 'US',
        label: 'United States',
        status: 'ALLOWED',
        countryCount: 1,
        targetedCountryCount: 1,
        allowedCountryCount: 1,
        blockedCountryCount: 0,
        licenseRequiredCountryCount: 0,
        pendingReviewCountryCount: 0,
        notTargetedCountryCount: 0,
        geoBlockRequiredCount: 0,
        countries: [],
        blockingReasons: [],
      },
      {
        regionCode: 'UK',
        label: 'United Kingdom',
        status: 'BLOCKED',
        countryCount: 1,
        targetedCountryCount: 1,
        allowedCountryCount: 0,
        blockedCountryCount: 1,
        licenseRequiredCountryCount: 0,
        pendingReviewCountryCount: 0,
        notTargetedCountryCount: 0,
        geoBlockRequiredCount: 1,
        countries: [],
        blockingReasons: [],
      },
    ],
    components: [
      {
        id: 'c-1',
        rightsProfileId: 'profile-1',
        componentType: 'ORIGINAL_TEXT',
        titleRu: 'Original Text',
        status: 'PUBLIC_DOMAIN',
        requiredAction: 'NONE',
        confidence: 'HIGH',
        notesRu: null,
        territoryAssessments: [
          {
            id: 'assessment-gb',
            rightsComponentId: 'c-1',
            countryCode: 'GB',
            status: 'BLOCKED',
            accessPolicy: 'BLOCK',
            geoBlockRequired: true,
            reasonRu: 'Original text is restricted.',
            legalBasisRu: 'UK term rule',
            publicDomainFromYear: null,
            rightsExpireAt: null,
            sourceEvidenceIds: ['e-1'],
            confidence: 'HIGH',
            notesRu: null,
            createdAt: '2026-07-26T10:00:00Z',
            updatedAt: '2026-07-26T10:00:00Z',
          },
        ],
        createdAt: '2026-07-26T10:00:00Z',
        updatedAt: '2026-07-26T10:00:00Z',
      },
    ],
    evidence: [
      {
        id: 'e-1',
        rightsProfileId: 'profile-1',
        evidenceType: 'AUTHOR_DEATH_YEAR_RECORD',
        sourceLevel: 'PRIMARY',
        title: 'Jane Austen death year',
        authority: 'Wikipedia',
        url: null,
        jurisdictionCode: 'US',
        accessedAt: null,
        relevantExcerpt: null,
        summaryRu: '1817 death year record',
        createdAt: '2026-07-26T10:00:00Z',
        updatedAt: '2026-07-26T10:00:00Z',
      },
    ],
    actions: [
      {
        id: 'a-1',
        rightsProfileId: 'profile-1',
        actionType: 'CONFIGURE_GEO_BLOCK',
        status: 'COMPLETED',
        descriptionRu: 'Block UK IP range',
        affectedCountryCodes: ['GB'],
        isBlocking: true,
        assignedToUserId: null,
        dueAt: null,
        completedAt: '2026-07-27T10:00:00Z',
        completedByUserId: 'user-1',
        completionNotesRu: null,
        isResolved: true,
        createdAt: '2026-07-26T10:00:00Z',
        updatedAt: '2026-07-26T10:00:00Z',
      },
    ],
  },
  approvedReview: mockReview,
  reviewHistory: [mockReview],
  approvalHistory: [],
  publicationGate: {
    versionId: 'v1',
    bookId: 'b1',
    canPublish: true,
    checkedAt: '2026-07-26T10:00:00Z',
    rightsProfileId: 'profile-1',
    approvedRightsReviewId: 'review-1',
    rightsStatus: 'APPROVED',
    blockingReasons: [],
    warnings: [],
    contentHashBaseline: 'hash123',
    contentHashCurrent: 'hash123',
    contentHashMatches: true,
    rightsRecheckRequired: false,
  },
  contentHash: {
    versionId: 'v1',
    baselineHash: 'hash123',
    currentHash: 'hash123',
    algorithmVersion: 'v1',
    matchesBaseline: true,
    isStale: false,
    recheckRequired: false,
    reasonCode: null,
    reasonRu: null,
    checkedAt: '2026-07-26T10:00:00Z',
  },
  summary: {
    hasClearance: true,
    canPublishCurrentVersion: true,
    publicationGate: 'ALLOW',
    overallStatus: 'APPROVED',
    confidence: 'HIGH',
    blockedCountriesCount: 1,
    licenseRequiredCountriesCount: 0,
    pendingCountriesCount: 0,
    geoBlockRequiredCount: 1,
    unresolvedBlockingActionsCount: 0,
    evidenceCount: 1,
    componentsCount: 1,
    componentTerritoryAssessmentsCount: 1,
    blockedComponentTerritoryAssessmentsCount: 1,
    reviewRequiredComponentTerritoryAssessmentsCount: 0,
    expiringComponentTerritoryAssessmentsCount: 0,
    reviewsCount: 1,
    isStale: false,
    recheckRequired: false,
  },
};

describe('RightsTab Components (Phase 10)', () => {
  describe('RightsTabEmptyState', () => {
    it('renders empty state message and links for legacy/unlinked books', () => {
      render(<RightsTabEmptyState lang="en" />);

      expect(screen.getByText('No Rights Clearance Linked')).toBeInTheDocument();
      expect(screen.getByText('Browse Rights Intakes')).toBeInTheDocument();
      expect(screen.getByText('Create Rights Intake')).toBeInTheDocument();
    });
  });

  describe('RightsTab Master Dashboard', () => {
    it('renders all dedicated sections when clearance data is present', () => {
      mockUseVersionRightsDashboard.mockReturnValue({
        data: mockDashboard,
        isLoading: false,
        isError: false,
        refetch: vi.fn(),
      });

      render(<RightsTab versionId="v1" bookId="b1" lang="en" />);

      // Top Summary & Metrics
      expect(screen.getByText('Gate: ALLOW')).toBeInTheDocument();
      expect(screen.getByText('Clearance: APPROVED')).toBeInTheDocument();
      expect(screen.getByText('Open Rights Intake')).toBeInTheDocument();

      // Language Editions
      expect(screen.getByText('Language Editions (2)')).toBeInTheDocument();
      expect(screen.getByText('Orgullo y prejuicio (ES)')).toBeInTheDocument();
      expect(screen.getByTestId('geo-block-rules-panel')).toBeInTheDocument();

      // Source Edition & Legal Basis
      expect(screen.getByText('Source Edition & Legal Basis')).toBeInTheDocument();
      expect(screen.getByText('PROJECT_GUTENBERG')).toBeInTheDocument();
      expect(screen.getByText('Author died > 70 yrs ago')).toBeInTheDocument();

      // Active Rights Profile
      expect(screen.getByText('Rights Profile')).toBeInTheDocument();
      expect(screen.getByText('Regions & Countries')).toBeInTheDocument();
      expect(screen.getByText('Total assessments: 1')).toBeInTheDocument();
      expect(screen.getByTestId('component-territory-GB')).toBeInTheDocument();

      // Review History
      expect(screen.getByText('Review History (1)')).toBeInTheDocument();

      // Phase 16: Copyright claims & DMCA panel replaced the old placeholder
      expect(screen.getByText('Претензии и DMCA (0)')).toBeInTheDocument();
      expect(screen.getByText('Активных претензий нет')).toBeInTheDocument();
    });
    // Phase 15: license metrics and coverage panel
    it('renders license metric tiles and the coverage panel when licenses exist', () => {
      mockUseVersionRightsDashboard.mockReturnValue({
        data: {
          ...mockDashboard,
          summary: {
            ...mockDashboard.summary,
            licenseRequiredCountriesCount: 1,
            licensesCount: 2,
            licenseCoverageStatus: 'COVERED',
            expiringSoonLicensesCount: 1,
          },
        },
        isLoading: false,
        isError: false,
        refetch: vi.fn(),
      });

      render(<RightsTab versionId="v1" bookId="b1" lang="en" />);

      expect(screen.getByText('Licenses')).toBeInTheDocument();
      expect(screen.getByText('Coverage')).toBeInTheDocument();
      expect(screen.getByText('Expiring')).toBeInTheDocument();
      expect(screen.getByText('Покрытие лицензиями')).toBeInTheDocument();
    });

    it('hides the coverage panel when no license is required and none is registered', () => {
      mockUseVersionRightsDashboard.mockReturnValue({
        data: {
          ...mockDashboard,
          summary: {
            ...mockDashboard.summary,
            licenseRequiredCountriesCount: 0,
            licensesCount: 0,
          },
        },
        isLoading: false,
        isError: false,
        refetch: vi.fn(),
      });

      render(<RightsTab versionId="v1" bookId="b1" lang="en" />);

      expect(screen.queryByText('Покрытие лицензиями')).not.toBeInTheDocument();
    });
  });
});
