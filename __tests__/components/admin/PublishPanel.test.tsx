import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PublishPanel } from '@/components/admin/books/PublishPanel/PublishPanel';
import type { PublicationGateResult } from '@/types/api-schema/rights-intake';

const mocks = vi.hoisted(() => ({
  snackbar: vi.fn(),
  publish: vi.fn(),
  unpublish: vi.fn(),
  gate: vi.fn(),
}));

vi.mock('notistack', () => ({
  useSnackbar: () => ({ enqueueSnackbar: mocks.snackbar }),
}));

vi.mock('@/api/hooks', () => ({
  usePublishVersion: () => ({ mutate: mocks.publish, isPending: false }),
  useUnpublishVersion: () => ({ mutate: mocks.unpublish, isPending: false }),
  usePublicationGate: () => mocks.gate(),
}));

const gateResult = (overrides: Partial<PublicationGateResult> = {}): PublicationGateResult =>
  ({
    versionId: 'version-1',
    bookId: 'book-1',
    canPublish: true,
    checkedAt: '2026-08-02T00:00:00.000Z',
    rightsProfileId: 'profile-1',
    approvedRightsReviewId: 'review-1',
    rightsStatus: 'APPROVED',
    blockingReasons: [],
    warnings: [],
    contentHashBaseline: 'hash',
    contentHashCurrent: 'hash',
    contentHashMatches: true,
    rightsRecheckRequired: false,
    ...overrides,
  }) as PublicationGateResult;

const arrangeGate = (state: {
  data?: PublicationGateResult;
  isLoading?: boolean;
  isError?: boolean;
}) => {
  mocks.gate.mockReturnValue({
    data: state.data,
    isLoading: state.isLoading ?? false,
    isError: state.isError ?? false,
  });
};

const renderPanel = () => render(<PublishPanel versionId="version-1" status="draft" />);

const publishButton = () => screen.getByRole('button', { name: /publish/i });

describe('PublishPanel — WP-A.5 three reasons to be disabled', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('says the gate is still being checked while the request is in flight', () => {
    arrangeGate({ isLoading: true });
    renderPanel();

    expect(publishButton()).toBeDisabled();
    expect(screen.getByText('Checking the rights gate…')).toBeInTheDocument();
    expect(
      screen.getByText(/the button unlocks as soon as the answer arrives/i)
    ).toBeInTheDocument();
    expect(screen.queryByText(/Publication blocked by rights gate/i)).not.toBeInTheDocument();
  });

  it('separates a failed gate request from a legal ban', () => {
    arrangeGate({ isError: true });
    renderPanel();

    expect(publishButton()).toBeDisabled();
    expect(screen.getByText(/Failed to check publication gate/i)).toBeInTheDocument();
    expect(screen.getByText(/technical error, not a legal restriction/i)).toBeInTheDocument();
    expect(screen.queryByText(/Publication blocked by rights gate/i)).not.toBeInTheDocument();
  });

  it('shows a legal ban only when the gate itself answered with blockers', () => {
    arrangeGate({
      data: gateResult({
        canPublish: false,
        blockingReasons: [
          {
            code: 'PENDING_TERRITORIES',
            severity: 'BLOCKER',
            messageRu: 'Есть территории с незавершённым решением по правам.',
          },
        ],
      }),
    });
    renderPanel();

    expect(publishButton()).toBeDisabled();
    expect(screen.getByText(/Publication blocked by rights gate/i)).toBeInTheDocument();
    expect(screen.getByText('Территории без решения')).toBeInTheDocument();
  });

  it('enables the button when the gate allows publication', () => {
    arrangeGate({ data: gateResult() });
    renderPanel();

    expect(publishButton()).toBeEnabled();
  });
});

describe('PublishPanel — WP-A.5 gate codes are never shown raw', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('names a code it knows', () => {
    arrangeGate({
      data: gateResult({
        canPublish: false,
        blockingReasons: [
          {
            code: 'GEO_BLOCK_RULES_MISSING',
            severity: 'BLOCKER',
            messageRu: 'Правила geo-block не сгенерированы.',
          },
        ],
      }),
    });
    renderPanel();

    expect(screen.getByText('Не созданы правила geo-block')).toBeInTheDocument();
    expect(screen.queryByText('GEO_BLOCK_RULES_MISSING')).not.toBeInTheDocument();
  });

  it('falls back to a readable label for a code it does not know', () => {
    arrangeGate({
      data: gateResult({
        canPublish: false,
        blockingReasons: [
          {
            code: 'SOME_FUTURE_BACKEND_CODE',
            severity: 'BLOCKER',
            messageRu: 'Новая причина от бэкенда.',
          },
        ],
      }),
    });
    renderPanel();

    expect(screen.queryByText('SOME_FUTURE_BACKEND_CODE')).not.toBeInTheDocument();
    expect(screen.getByText('Другое требование гейта прав')).toBeInTheDocument();
    expect(screen.getByText('Новая причина от бэкенда.')).toBeInTheDocument();
  });

  it('labels the WP-A.1 warning about a geo-block flag without closed markets', () => {
    arrangeGate({
      data: gateResult({
        warnings: [
          {
            code: 'GEO_BLOCK_REQUIRED_WITHOUT_RESTRICTED_COUNTRIES',
            severity: 'WARNING',
            messageRu: 'Ни одна страна не закрыта.',
          },
        ],
      }),
    });
    renderPanel();

    expect(screen.getByText('Geo-block отмечен, но закрытых стран нет')).toBeInTheDocument();
  });
});

/**
 * WP-H: гейт отвечает на два вопроса. Публикация закрыта — материал по-прежнему можно готовить,
 * если ни один блокер не входит в список запрещающих подготовку.
 */
describe('PublishPanel — WP-H preparation stage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('tells the editor that preparation continues while publication is blocked', () => {
    arrangeGate({
      data: gateResult({
        canPublish: false,
        canPrepare: true,
        preparationBlockingReasons: [],
        blockingReasons: [
          {
            code: 'PENDING_TERRITORIES',
            severity: 'BLOCKER',
            messageRu: 'Есть территории без решения.',
          },
        ],
      }),
    });
    renderPanel();

    expect(publishButton()).toBeDisabled();
    expect(screen.getByText(/keep filling chapters and metadata/i)).toBeInTheDocument();
    expect(screen.queryByText('Blocks preparation too')).not.toBeInTheDocument();
  });

  it('marks the reason that stops preparation as well and drops the note', () => {
    arrangeGate({
      data: gateResult({
        canPublish: false,
        canPrepare: false,
        preparationBlockingReasons: [
          {
            code: 'PUBLICATION_GATE_BLOCK',
            severity: 'BLOCKER',
            messageRu: 'Публикация запрещена по результатам проверки.',
          },
        ],
        blockingReasons: [
          {
            code: 'PUBLICATION_GATE_BLOCK',
            severity: 'BLOCKER',
            messageRu: 'Публикация запрещена по результатам проверки.',
          },
          {
            code: 'PENDING_TERRITORIES',
            severity: 'BLOCKER',
            messageRu: 'Есть территории без решения.',
          },
        ],
      }),
    });
    renderPanel();

    expect(screen.getByText('Blocks preparation too')).toBeInTheDocument();
    expect(screen.queryByText(/keep filling chapters and metadata/i)).not.toBeInTheDocument();
  });

  it('says nothing about preparation when the backend does not report the stage', () => {
    arrangeGate({
      data: gateResult({
        canPublish: false,
        blockingReasons: [
          {
            code: 'PENDING_TERRITORIES',
            severity: 'BLOCKER',
            messageRu: 'Есть территории без решения.',
          },
        ],
      }),
    });
    renderPanel();

    expect(screen.queryByText(/keep filling chapters and metadata/i)).not.toBeInTheDocument();
    expect(screen.queryByText('Blocks preparation too')).not.toBeInTheDocument();
  });
});
