'use client';

import { useState, type FC } from 'react';
import { AlertTriangle, Copy, KeyRound, Terminal } from 'lucide-react';
import {
  useCreateRightsAgentToken,
  useRevokeRightsAgentToken,
  useRightsAgentSubmissions,
  useRightsAgentTokens,
} from '@/api/hooks/useRightsAgent';
import type { RightsAgentToken, RightsAgentTokenIssued } from '@/types/api-schema/rights-agent';
import styles from './AgentAutomationPanel.module.scss';

const REPORT_SCHEMA_URL = 'https://api.bibliaris.com/api/rights/agent/report-schema/1.0';
const SUBMISSION_ENDPOINT = 'https://api.bibliaris.com/api/rights/agent/submissions';
const DEFAULT_TTL_HOURS = 72;
const DEFAULT_MAX_USES = 1;

export interface AgentAutomationPanelProps {
  intakeId: string;
  workflowStatus: string;
}

const formatDateTime = (value: string | null): string =>
  value ? new Date(value).toLocaleString() : '—';

const buildCurlSnippet = (token: string, intakeId: string): string =>
  [
    `curl -X POST ${SUBMISSION_ENDPOINT} \\`,
    '  -H "Content-Type: application/json" \\',
    `  -H "X-Bibliaris-Agent-Token: ${token}" \\`,
    `  -d '{"intakeId":"${intakeId}","report":{ … }}'`,
  ].join('\n');

export const AgentAutomationPanel: FC<AgentAutomationPanelProps> = ({
  intakeId,
  workflowStatus,
}) => {
  const [labelRu, setLabelRu] = useState('');
  const [ttlHours, setTtlHours] = useState(DEFAULT_TTL_HOURS);
  const [maxUses, setMaxUses] = useState(DEFAULT_MAX_USES);
  const [autoMaterialize, setAutoMaterialize] = useState(true);
  const [allowRetryOnValidationError, setAllowRetryOnValidationError] = useState(true);
  // The raw token lives only here: never in the React Query cache, never in localStorage.
  const [issuedToken, setIssuedToken] = useState<RightsAgentTokenIssued | null>(null);
  const [copyStatus, setCopyStatus] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<RightsAgentToken | null>(null);
  const [revokeReason, setRevokeReason] = useState('');

  const tokensQuery = useRightsAgentTokens(intakeId);
  const submissionsQuery = useRightsAgentSubmissions(intakeId);
  const createTokenMutation = useCreateRightsAgentToken(intakeId);
  const revokeTokenMutation = useRevokeRightsAgentToken();

  const tokens = tokensQuery.data?.items ?? [];
  const submissions = submissionsQuery.data?.items ?? [];
  const activeToken = tokens.find((token) => token.isUsable) ?? null;
  const canIssue = workflowStatus === 'READY_FOR_AGENT';

  const copyToClipboard = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopyStatus(`${label} copied!`);
    } catch {
      setCopyStatus('Clipboard unavailable');
    }
    setTimeout(() => setCopyStatus(null), 2000);
  };

  const handleIssue = async () => {
    setFormError(null);
    try {
      const issued = await createTokenMutation.mutateAsync({
        labelRu: labelRu.trim() || undefined,
        ttlHours,
        maxUses,
        autoMaterialize,
        allowRetryOnValidationError,
      });
      setIssuedToken(issued);
      setLabelRu('');
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Failed to issue upload token.');
    }
  };

  const handleRevoke = async () => {
    if (!revokeTarget) return;
    setFormError(null);
    try {
      await revokeTokenMutation.mutateAsync({
        tokenId: revokeTarget.id,
        data: { reasonRu: revokeReason.trim() },
      });
      setRevokeTarget(null);
      setRevokeReason('');
      setIssuedToken(null);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Failed to revoke upload token.');
    }
  };

  return (
    <div className={styles.section}>
      <h2 className={styles.sectionTitle}>Agent API Automation</h2>
      <p className={styles.sectionHint}>
        Issue a one-time upload token so the external ChatGPT agent can fetch the manifest and post
        its report directly. A submitted report is never auto-approved — a human still has to
        approve it.
      </p>

      {activeToken && (
        <div className={styles.activeToken}>
          <p className={styles.activeTokenMeta}>
            Active token <span className={styles.mono}>{activeToken.tokenPrefix}…</span> · expires{' '}
            {formatDateTime(activeToken.expiresAt)} · {activeToken.remainingUses} use(s) left
          </p>
          <button
            className={styles.actionBtnDanger}
            onClick={() => {
              setRevokeTarget(activeToken);
              setRevokeReason('');
            }}
          >
            Revoke
          </button>
        </div>
      )}

      {canIssue ? (
        <>
          <div className={styles.row}>
            <div className={styles.field}>
              <label className={styles.fieldLabel} htmlFor="agent-token-label">
                Label
              </label>
              <input
                id="agent-token-label"
                className={styles.textInput}
                type="text"
                placeholder="для ChatGPT-агента"
                value={labelRu}
                onChange={(event) => setLabelRu(event.target.value)}
              />
            </div>
            <div className={styles.field}>
              <label className={styles.fieldLabel} htmlFor="agent-token-ttl">
                TTL, hours
              </label>
              <input
                id="agent-token-ttl"
                className={styles.numberInput}
                type="number"
                min={1}
                max={720}
                value={ttlHours}
                onChange={(event) => setTtlHours(Number(event.target.value))}
              />
            </div>
            <div className={styles.field}>
              <label className={styles.fieldLabel} htmlFor="agent-token-max-uses">
                Max uses
              </label>
              <input
                id="agent-token-max-uses"
                className={styles.numberInput}
                type="number"
                min={1}
                max={10}
                value={maxUses}
                onChange={(event) => setMaxUses(Number(event.target.value))}
              />
            </div>
          </div>

          <div className={styles.row}>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={autoMaterialize}
                onChange={(event) => setAutoMaterialize(event.target.checked)}
              />
              Auto-materialize rights profile
            </label>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={allowRetryOnValidationError}
                onChange={(event) => setAllowRetryOnValidationError(event.target.checked)}
              />
              Allow retry after a validation error
            </label>
          </div>

          <div className={styles.row}>
            <button
              className={styles.actionBtnPrimary}
              onClick={handleIssue}
              disabled={createTokenMutation.isPending}
            >
              <KeyRound size={14} />
              {createTokenMutation.isPending ? 'Issuing…' : 'Issue Upload Token'}
            </button>
          </div>
        </>
      ) : (
        <div className={styles.row}>
          <button className={styles.actionBtnPrimary} disabled>
            <KeyRound size={14} />
            Issue Upload Token
          </button>
          <span className={styles.sectionHint}>
            Mark this intake as <strong>Ready For Agent</strong> first.
          </span>
        </div>
      )}

      {formError && <p className={styles.errorText}>{formError}</p>}

      {issuedToken && (
        <div className={styles.tokenReveal}>
          <p className={styles.tokenRevealWarning}>
            <AlertTriangle size={16} />
            Токен показывается один раз. Скопируйте его сейчас — повторно он не будет доступен.
          </p>
          <code className={styles.tokenValue}>{issuedToken.token}</code>
          <div className={styles.row}>
            <button
              className={styles.actionBtnSecondary}
              onClick={() => copyToClipboard(issuedToken.token, 'Token')}
            >
              <Copy size={14} />
              Copy token
            </button>
            <button
              className={styles.actionBtnSecondary}
              onClick={() =>
                copyToClipboard(buildCurlSnippet(issuedToken.token, intakeId), 'cURL snippet')
              }
            >
              <Terminal size={14} />
              Copy cURL
            </button>
            {copyStatus && <span className={styles.sectionHint}>{copyStatus}</span>}
          </div>
        </div>
      )}

      <h3 className={styles.subTitle}>Token history</h3>
      {tokens.length === 0 ? (
        <p className={styles.emptyState}>Токенов пока нет.</p>
      ) : (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Prefix</th>
                <th>Status</th>
                <th>Uses</th>
                <th>Expires</th>
                <th>Issued by</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {tokens.map((token) => (
                <tr key={token.id}>
                  <td className={styles.mono}>{token.tokenPrefix}…</td>
                  <td>
                    <span className={styles.badge} data-status={token.status}>
                      {token.status}
                    </span>
                  </td>
                  <td>
                    {token.usedCount}/{token.maxUses}
                  </td>
                  <td>{formatDateTime(token.expiresAt)}</td>
                  <td>{token.issuedByUserId ?? '—'}</td>
                  <td>{formatDateTime(token.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h3 className={styles.subTitle}>Agent submissions</h3>
      {submissions.length === 0 ? (
        <p className={styles.emptyState}>Отправок агента пока нет.</p>
      ) : (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Received</th>
                <th>Status</th>
                <th>Schema</th>
                <th>Errors / warnings</th>
                <th>Materialization</th>
                <th>Agent</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {submissions.map((submission) => (
                <tr key={submission.id}>
                  <td>{formatDateTime(submission.createdAt)}</td>
                  <td>
                    <span className={styles.badge} data-status={submission.status}>
                      {submission.status}
                    </span>
                  </td>
                  <td>{submission.declaredSchemaVersion ?? '—'}</td>
                  <td>
                    {submission.validationErrorCount} / {submission.validationWarningCount}
                  </td>
                  <td>
                    <span className={styles.badge} data-status={submission.materialization}>
                      {submission.materialization}
                    </span>
                  </td>
                  <td>{submission.agentName ?? '—'}</td>
                  <td className={styles.rejectionCell}>
                    {submission.rejectionCode ? (
                      <>
                        <strong>{submission.rejectionCode}</strong>
                        {submission.rejectionMessageRu ? ` — ${submission.rejectionMessageRu}` : ''}
                      </>
                    ) : submission.rightsReviewImportId ? (
                      <a href="#review-import-history">Открыть импорт</a>
                    ) : (
                      '—'
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <a
        className={styles.schemaLink}
        href={REPORT_SCHEMA_URL}
        target="_blank"
        rel="noopener noreferrer"
      >
        Report JSON Schema 1.0
      </a>

      {revokeTarget && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h3 className={styles.modalTitle}>Revoke token {revokeTarget.tokenPrefix}…</h3>
            <label className={styles.fieldLabel} htmlFor="agent-token-revoke-reason">
              Reason (required)
            </label>
            <textarea
              id="agent-token-revoke-reason"
              className={styles.modalTextarea}
              rows={3}
              value={revokeReason}
              onChange={(event) => setRevokeReason(event.target.value)}
            />
            <div className={styles.row}>
              <button
                className={styles.actionBtnPrimary}
                onClick={handleRevoke}
                disabled={revokeReason.trim().length < 3 || revokeTokenMutation.isPending}
              >
                {revokeTokenMutation.isPending ? 'Revoking…' : 'Revoke'}
              </button>
              <button
                className={styles.actionBtnSecondary}
                onClick={() => {
                  setRevokeTarget(null);
                  setRevokeReason('');
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
