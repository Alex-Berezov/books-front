import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AgentAutomationPanel } from '@/components/admin/RightsIntakeDetail/AgentAutomationPanel/AgentAutomationPanel';
import type {
  RightsAgentSubmission,
  RightsAgentToken,
  RightsAgentTokenIssued,
} from '@/types/api-schema/rights-agent';

const mockUseRightsAgentTokens = vi.fn();
const mockUseRightsAgentSubmissions = vi.fn();
const mockCreateToken = vi.fn();

vi.mock('@/api/hooks/useRightsAgent', () => ({
  useRightsAgentTokens: () => mockUseRightsAgentTokens(),
  useRightsAgentSubmissions: () => mockUseRightsAgentSubmissions(),
  useCreateRightsAgentToken: () => ({ mutateAsync: mockCreateToken, isPending: false }),
  useRevokeRightsAgentToken: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

const makeToken = (overrides: Partial<RightsAgentToken> = {}): RightsAgentToken => ({
  id: 'token-1',
  rightsIntakeId: 'intake-1',
  tokenPrefix: 'brat_AbCdEfG',
  status: 'ACTIVE',
  labelRu: 'для ChatGPT-агента',
  maxUses: 1,
  usedCount: 0,
  remainingUses: 1,
  failedAttempts: 0,
  maxFailedAttempts: 5,
  allowRetryOnValidationError: true,
  autoMaterialize: true,
  allowedSchemaVersions: null,
  expiresAt: '2026-08-01T12:00:00.000Z',
  isExpired: false,
  isUsable: true,
  issuedByUserId: 'user-1',
  firstUsedAt: null,
  lastUsedAt: null,
  revokedAt: null,
  revokeReasonRu: null,
  createdAt: '2026-07-29T12:00:00.000Z',
  updatedAt: '2026-07-29T12:00:00.000Z',
  ...overrides,
});

const makeSubmission = (overrides: Partial<RightsAgentSubmission> = {}): RightsAgentSubmission => ({
  id: 'submission-1',
  rightsIntakeId: 'intake-1',
  uploadTokenId: 'token-1',
  tokenPrefix: 'brat_AbCdEfG',
  status: 'VALIDATED',
  declaredSchemaVersion: '1.0',
  reportJsonSha256: 'sha',
  payloadSizeBytes: 2048,
  sourceFileName: null,
  agentName: 'chatgpt-clearance',
  agentVersion: '1.0',
  rightsReviewImportId: 'import-1',
  validationErrorCount: 0,
  validationWarningCount: 2,
  rejectionCode: null,
  rejectionMessageRu: null,
  materialization: 'SUCCEEDED',
  materializationError: null,
  materializedProfileId: 'profile-1',
  processedAt: '2026-07-29T12:05:00.000Z',
  createdAt: '2026-07-29T12:05:00.000Z',
  ...overrides,
});

const mockData = (tokens: RightsAgentToken[], submissions: RightsAgentSubmission[] = []) => {
  mockUseRightsAgentTokens.mockReturnValue({
    data: { items: tokens, total: tokens.length, page: 1, limit: 20 },
    isLoading: false,
  });
  mockUseRightsAgentSubmissions.mockReturnValue({
    data: { items: submissions, total: submissions.length, page: 1, limit: 20 },
    isLoading: false,
  });
};

describe('AgentAutomationPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockData([]);
  });

  it('disables issuing and explains why while the intake is DRAFT', () => {
    render(<AgentAutomationPanel intakeId="intake-1" workflowStatus="DRAFT" />);

    expect(screen.getByRole('button', { name: /Issue Upload Token/i })).toBeDisabled();
    expect(screen.getByText(/Ready For Agent/i)).toBeInTheDocument();
  });

  it('enables issuing for a READY_FOR_AGENT intake', () => {
    render(<AgentAutomationPanel intakeId="intake-1" workflowStatus="READY_FOR_AGENT" />);

    expect(screen.getByRole('button', { name: /Issue Upload Token/i })).toBeEnabled();
  });

  it('shows the raw token once, with the single-display warning', async () => {
    const issued: RightsAgentTokenIssued = { ...makeToken(), token: 'brat_SUPERSECRETVALUE' };
    mockCreateToken.mockResolvedValue(issued);

    render(<AgentAutomationPanel intakeId="intake-1" workflowStatus="READY_FOR_AGENT" />);
    await userEvent.click(screen.getByRole('button', { name: /Issue Upload Token/i }));

    await waitFor(() => {
      expect(screen.getByText('brat_SUPERSECRETVALUE')).toBeInTheDocument();
    });
    expect(screen.getByText(/Токен показывается один раз/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Copy cURL/i })).toBeInTheDocument();
  });

  it('renders the token table with prefixes only, never a full token', () => {
    mockData([makeToken({ usedCount: 1, status: 'USED', isUsable: false })]);

    render(<AgentAutomationPanel intakeId="intake-1" workflowStatus="READY_FOR_AGENT" />);

    expect(screen.getByText('brat_AbCdEfG…')).toBeInTheDocument();
    expect(screen.getByText('USED')).toBeInTheDocument();
    expect(screen.getByText('1/1')).toBeInTheDocument();
    expect(screen.queryByText(/SUPERSECRET/)).not.toBeInTheDocument();
  });

  it('renders submission statuses, counters and the rejection code', () => {
    mockData(
      [makeToken()],
      [
        makeSubmission(),
        makeSubmission({
          id: 'submission-2',
          status: 'REJECTED',
          materialization: 'NOT_ATTEMPTED',
          validationWarningCount: 0,
          rightsReviewImportId: null,
          rejectionCode: 'DUPLICATE_SUBMISSION',
          rejectionMessageRu: 'Такой отчёт уже импортирован для этого интейка.',
        }),
      ]
    );

    render(<AgentAutomationPanel intakeId="intake-1" workflowStatus="READY_FOR_AGENT" />);

    expect(screen.getByText('VALIDATED')).toBeInTheDocument();
    expect(screen.getByText('SUCCEEDED')).toBeInTheDocument();
    expect(screen.getByText('0 / 2')).toBeInTheDocument();
    expect(screen.getByText('DUPLICATE_SUBMISSION')).toBeInTheDocument();
  });

  it('shows the empty state when no token has been issued yet', () => {
    render(<AgentAutomationPanel intakeId="intake-1" workflowStatus="READY_FOR_AGENT" />);

    expect(screen.getByText('Токенов пока нет.')).toBeInTheDocument();
    expect(screen.getByText('Отправок агента пока нет.')).toBeInTheDocument();
  });
});
