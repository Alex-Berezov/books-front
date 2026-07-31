'use client';

import { useState, type FC } from 'react';
import { AlertTriangle, CheckCircle2, MapPin, RefreshCw, ShieldCheck } from 'lucide-react';
import { useSnackbar } from 'notistack';
import {
  useCheckGeoBlockAccess,
  useGenerateGeoBlockRules,
  useGeoBlockRules,
  useVerifyGeoBlockRules,
} from '@/api/hooks/useBookVersions';
import { Button } from '@/components/common/Button';
import type {
  GeoAccessCheckResult,
  GeoBlockScope,
  GeoCountrySourceHealth,
} from '@/types/api-schema/geo-block';
import styles from './GeoBlockRulesPanel.module.scss';

const GEO_BLOCK_SCOPES: GeoBlockScope[] = [
  'ENTIRE_BOOK',
  'LANGUAGE_EDITION',
  'TEXT_READER',
  'DOWNLOADS',
  'AUDIO',
  'SPECIFIC_ASSET',
];

export interface GeoBlockRulesPanelProps {
  versionId: string;
  /** WP-1.2а: health of the country source Phase 12 depends on, taken from the rights dashboard. */
  countrySource?: GeoCountrySourceHealth | null;
}

const formatDate = (value: string | null): string => {
  return value ? new Date(value).toLocaleString() : 'Not verified';
};

const formatPercent = (ratio: number): string => `${Math.round(ratio * 100)}%`;

export const GeoBlockRulesPanel: FC<GeoBlockRulesPanelProps> = (props) => {
  const { versionId, countrySource } = props;
  const { enqueueSnackbar } = useSnackbar();
  const { data, isLoading, isError, refetch } = useGeoBlockRules(versionId);
  const [countryCode, setCountryCode] = useState('GB');
  const [scope, setScope] = useState<GeoBlockScope>('TEXT_READER');
  const [notesRu, setNotesRu] = useState('');
  const [checkResult, setCheckResult] = useState<GeoAccessCheckResult | null>(null);
  const [hasBlockedCheck, setHasBlockedCheck] = useState(false);
  const [hasAllowedCheck, setHasAllowedCheck] = useState(false);

  const generateMutation = useGenerateGeoBlockRules({
    onSuccess: () => {
      setCheckResult(null);
      setHasBlockedCheck(false);
      setHasAllowedCheck(false);
      enqueueSnackbar('Geo-block rules generated', { variant: 'success' });
    },
    onError: (error) => {
      enqueueSnackbar(`Failed to generate rules: ${error.message}`, { variant: 'error' });
    },
  });
  const checkMutation = useCheckGeoBlockAccess({
    onSuccess: (result) => {
      setCheckResult(result);
      setHasAllowedCheck((current) => current || result.allowed);
      setHasBlockedCheck((current) => current || !result.allowed);
    },
    onError: (error) => {
      enqueueSnackbar(`Failed to check access: ${error.message}`, { variant: 'error' });
    },
  });
  const verifyMutation = useVerifyGeoBlockRules({
    onSuccess: () => {
      enqueueSnackbar('Geo-block enforcement verified', { variant: 'success' });
    },
    onError: (error) => {
      enqueueSnackbar(`Failed to verify geo-block: ${error.message}`, { variant: 'error' });
    },
  });

  const handleGenerate = () => {
    generateMutation.mutate(versionId);
  };

  const handleCheck = () => {
    checkMutation.mutate({
      versionId,
      data: {
        countryCode: countryCode.trim().toUpperCase(),
        scope,
      },
    });
  };

  const handleVerify = () => {
    verifyMutation.mutate({
      versionId,
      data: {
        verified: true,
        notesRu: notesRu.trim() || null,
      },
    });
  };

  if (isLoading) {
    return <div className={styles.panel}>Loading geo-block rules...</div>;
  }

  if (isError || !data) {
    return (
      <div className={styles.panel}>
        <p className={styles.error}>Failed to load geo-block rules.</p>
        <Button variant="secondary" size="sm" onClick={() => refetch()}>
          Retry
        </Button>
      </div>
    );
  }

  const { rules, summary } = data;
  const activeRules = rules.filter((rule) => rule.isActive);
  const verifiedByUserId =
    activeRules.find((rule) => rule.verifiedByUserId)?.verifiedByUserId ?? null;
  const canVerify =
    activeRules.length > 0 && hasBlockedCheck && hasAllowedCheck && !verifyMutation.isPending;
  // WP-1.2а: rules only enforce anything while the upstream proxy keeps sending a country.
  const countrySourceBroken =
    summary.geoBlockRequired &&
    (countrySource?.status === 'UNAVAILABLE' || countrySource?.status === 'DEGRADED');

  return (
    <section className={styles.panel} aria-labelledby="geo-block-rules-title">
      <div className={styles.header}>
        <div>
          <h2 id="geo-block-rules-title" className={styles.title}>
            <MapPin size={18} />
            GeoIP Market Blocking
          </h2>
          <p className={styles.description}>
            These rules enforce the current rights profile by country. They are operational
            controls, not legal advice.
          </p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          loading={generateMutation.isPending}
          onClick={handleGenerate}
          leftIcon={<RefreshCw size={14} />}
        >
          Generate rules
        </Button>
      </div>

      {summary.geoBlockRequired && activeRules.length === 0 && (
        <div className={styles.warning} role="alert">
          <AlertTriangle size={16} />
          Geo-block is required, but no active runtime rules have been generated.
        </div>
      )}

      {countrySourceBroken && countrySource && (
        <div className={styles.warning} role="alert">
          <AlertTriangle size={16} />
          <span>
            {countrySource.status === 'UNAVAILABLE'
              ? 'The visitor country is not reaching the API at all — geo-block rules cannot fire.'
              : `${formatPercent(countrySource.unknownRatio)} of requests arrive without a country — geo-block enforcement is partial.`}{' '}
            Check that the API domain is proxied by Cloudflare and that IP Geolocation is enabled (
            {countrySource.unknownCount} of {countrySource.totalCount} requests since{' '}
            {formatDate(countrySource.windowStartedAt)}).
          </span>
        </div>
      )}

      <div className={styles.summaryGrid}>
        <div className={styles.summaryItem}>
          <span>Required</span>
          <strong>{summary.geoBlockRequired ? 'Yes' : 'No'}</strong>
        </div>
        <div className={styles.summaryItem}>
          <span>Status</span>
          <strong>{summary.configured ? 'Verified' : 'Generated, not verified'}</strong>
        </div>
        <div className={styles.summaryItem}>
          <span>Active rules</span>
          <strong>{summary.activeRulesCount}</strong>
        </div>
        <div className={styles.summaryItem}>
          <span>Blocked countries</span>
          <strong>{summary.blockedCountries.join(', ') || 'None'}</strong>
        </div>
        <div className={styles.summaryItem}>
          <span>Scopes</span>
          <strong>{summary.scopes.join(', ') || 'None'}</strong>
        </div>
        <div className={styles.summaryItem}>
          <span>Verified at</span>
          <strong>{formatDate(summary.verifiedAt)}</strong>
          {verifiedByUserId && <small>User: {verifiedByUserId}</small>}
        </div>
      </div>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Country</th>
              <th>Scope</th>
              <th>Policy</th>
              <th>Reason</th>
              <th>Active</th>
              <th>Verified at</th>
            </tr>
          </thead>
          <tbody>
            {rules.length === 0 ? (
              <tr>
                <td colSpan={6} className={styles.emptyCell}>
                  No generated rules.
                </td>
              </tr>
            ) : (
              rules.map((rule) => (
                <tr key={rule.id}>
                  <td>{rule.countryCode}</td>
                  <td>{rule.scope}</td>
                  <td>{rule.accessPolicy}</td>
                  <td>{rule.reasonRu || '—'}</td>
                  <td>{rule.isActive ? 'Yes' : 'No'}</td>
                  <td>{formatDate(rule.verifiedAt)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className={styles.controls}>
        <div className={styles.controlGroup}>
          <h3>Test country</h3>
          <div className={styles.formRow}>
            <label>
              Country code
              <input
                aria-label="Country code"
                maxLength={2}
                value={countryCode}
                onChange={(event) => setCountryCode(event.target.value)}
              />
            </label>
            <label>
              Scope
              <select
                aria-label="Geo-block scope"
                value={scope}
                onChange={(event) => setScope(event.target.value as GeoBlockScope)}
              >
                {GEO_BLOCK_SCOPES.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
            <Button
              variant="secondary"
              size="sm"
              loading={checkMutation.isPending}
              disabled={!/^[A-Za-z]{2}$/.test(countryCode.trim())}
              onClick={handleCheck}
            >
              Check access
            </Button>
          </div>
          {checkResult && (
            <div
              className={checkResult.allowed ? styles.allowedResult : styles.blockedResult}
              role="status"
            >
              {checkResult.allowed ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
              <span>
                {checkResult.allowed ? 'Allowed' : 'Blocked'} for {checkResult.countryCode}
                {checkResult.reasonCode ? ` — ${checkResult.reasonCode}` : ''}
                {checkResult.matchedRuleId ? ` (rule ${checkResult.matchedRuleId})` : ''}
              </span>
            </div>
          )}
        </div>

        <div className={styles.controlGroup}>
          <h3>Verify enforcement</h3>
          <textarea
            aria-label="Verification notes"
            placeholder="Describe blocked and allowed country checks"
            value={notesRu}
            onChange={(event) => setNotesRu(event.target.value)}
          />
          <p className={styles.hint}>
            Run at least one blocked and one allowed check after generation before verification.
          </p>
          <Button
            variant="success"
            size="sm"
            disabled={!canVerify}
            loading={verifyMutation.isPending}
            onClick={handleVerify}
            leftIcon={<ShieldCheck size={14} />}
          >
            Verify geo-block
          </Button>
        </div>
      </div>
    </section>
  );
};
