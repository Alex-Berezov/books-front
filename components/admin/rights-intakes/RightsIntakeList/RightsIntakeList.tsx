'use client';

import { useState, type FC } from 'react';
import { ClipboardList, Plus, AlertCircle, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { useRightsIntakes } from '@/api/hooks/useRightsIntakes';
import { EmptyState, Pagination } from '@/components/admin/shared';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import type { SupportedLang } from '@/lib/i18n/lang';
import type {
  RightsIntakeStatus,
  RightsSourceProvider,
  RightsIntakeListItem,
} from '@/types/api-schema/rights-intake';
import styles from './RightsIntakeList.module.scss';

const STATUS_OPTIONS: Array<{ value: RightsIntakeStatus | ''; label: string }> = [
  { value: '', label: 'All Statuses' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'READY_FOR_AGENT', label: 'Ready For Agent' },
  { value: 'REVIEW_IMPORTED', label: 'Review Imported' },
  { value: 'HUMAN_REVIEW_REQUIRED', label: 'Human Review Required' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'BOOK_CREATED', label: 'Book Created' },
  { value: 'ARCHIVED', label: 'Archived' },
];

const SOURCE_PROVIDER_OPTIONS: Array<{ value: RightsSourceProvider | ''; label: string }> = [
  { value: '', label: 'All Providers' },
  { value: 'PROJECT_GUTENBERG', label: 'Project Gutenberg' },
  { value: 'OTHER', label: 'Other' },
  { value: 'UNKNOWN', label: 'Unknown' },
];

const LANG_OPTIONS: Array<{ value: string; label: string }> = [
  { value: '', label: 'All Target Languages' },
  { value: 'en', label: 'English (en)' },
  { value: 'es', label: 'Spanish (es)' },
  { value: 'fr', label: 'French (fr)' },
  { value: 'pt', label: 'Portuguese (pt)' },
  { value: 'ru', label: 'Russian (ru)' },
];

interface RightsIntakeListProps {
  lang: SupportedLang;
}

export const RightsIntakeList: FC<RightsIntakeListProps> = ({ lang }) => {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<RightsIntakeStatus | ''>('');
  const [sourceProviderFilter, setSourceProviderFilter] = useState<RightsSourceProvider | ''>('');
  const [targetLangFilter, setTargetLangFilter] = useState<string>('');
  const [attentionOnly, setAttentionOnly] = useState<boolean>(false);

  const { data, isLoading, error } = useRightsIntakes({
    page,
    limit: 20,
    status: statusFilter || undefined,
    q: search || undefined,
    sourceProvider: sourceProviderFilter || undefined,
    targetLanguage: targetLangFilter || undefined,
    attentionOnly: attentionOnly || undefined,
    includeSummary: true,
  });

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>Rights Intakes</h1>
        </div>
        <div className={styles.error}>
          <p>Failed to load rights intakes</p>
          <p className={styles.errorMessage}>{error.message}</p>
        </div>
      </div>
    );
  }

  const totalPages = data ? Math.ceil(data.total / data.limit) : 0;
  const intakes = data?.items || [];

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.titleRow}>
          <h1 className={styles.title}>Rights Intakes</h1>
          <Link href={`/admin/${lang}/rights-intakes/new`} className={styles.createButton}>
            <Plus size={16} />
            New Rights Intake
          </Link>
        </div>
      </div>

      <div className={styles.toolbar}>
        <div className={styles.searchInput}>
          <Input
            value={search}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search title, author, source..."
          />
        </div>
        <select
          className={styles.filterSelect}
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value as RightsIntakeStatus | '');
            setPage(1);
          }}
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <select
          className={styles.filterSelect}
          value={sourceProviderFilter}
          onChange={(e) => {
            setSourceProviderFilter(e.target.value as RightsSourceProvider | '');
            setPage(1);
          }}
        >
          {SOURCE_PROVIDER_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <select
          className={styles.filterSelect}
          value={targetLangFilter}
          onChange={(e) => {
            setTargetLangFilter(e.target.value);
            setPage(1);
          }}
        >
          {LANG_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <button
          className={styles.attentionToggle}
          data-active={attentionOnly}
          onClick={() => {
            setAttentionOnly(!attentionOnly);
            setPage(1);
          }}
        >
          <AlertCircle size={14} />
          Requires Attention
        </button>
      </div>

      {data && (
        <div className={styles.info}>
          Showing {intakes.length} of {data.total} intakes
        </div>
      )}

      {isLoading ? (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Title & Author</th>
                <th>Source</th>
                <th>Languages</th>
                <th>Countries</th>
                <th>Status & Indicators</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 7 }).map((_, j) => (
                    <td key={j} className={styles.skeletonCell}>
                      Loading...
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : intakes.length === 0 ? (
        <EmptyState
          title="No rights intakes found."
          description={
            search || statusFilter || sourceProviderFilter || targetLangFilter || attentionOnly
              ? 'Try adjusting your search or filter parameters'
              : 'Start by creating a new rights intake request'
          }
          icon={<ClipboardList />}
          action={
            !search &&
            !statusFilter &&
            !sourceProviderFilter &&
            !targetLangFilter &&
            !attentionOnly ? (
              <Link href={`/admin/${lang}/rights-intakes/new`}>
                <Button>New Rights Intake</Button>
              </Link>
            ) : undefined
          }
        />
      ) : (
        <>
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Title & Author</th>
                  <th>Source</th>
                  <th>Languages</th>
                  <th>Countries</th>
                  <th>Status & Indicators</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {intakes.map((intake) => (
                  <tr key={intake.id}>
                    <td className={styles.cellTitle}>
                      <Link
                        href={`/admin/${lang}/rights-intakes/${intake.id}`}
                        className={styles.cellLink}
                      >
                        {intake.candidateTitle}
                      </Link>
                      <div className={styles.cellSub}>by {intake.candidateAuthor}</div>
                      {intake.originalTitle && intake.originalTitle !== intake.candidateTitle && (
                        <div className={styles.cellSub}>Orig: {intake.originalTitle}</div>
                      )}
                    </td>
                    <td>
                      <div>
                        {intake.sourceProvider !== 'UNKNOWN'
                          ? `${intake.sourceProvider}${intake.sourceExternalId ? ` #${intake.sourceExternalId}` : ''}`
                          : 'Unknown'}
                      </div>
                      {intake.sourceUrl && (
                        <a
                          href={intake.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={styles.cellSub}
                        >
                          <ExternalLink size={12} style={{ display: 'inline', marginRight: 2 }} />
                          Source Link
                        </a>
                      )}
                    </td>
                    <td>
                      <div className={styles.languages}>
                        {intake.targetLanguages.map((l) => (
                          <span key={l} className={styles.langTag}>
                            {l}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td>
                      <span className={styles.countriesBadge}>
                        {intake.targetCountryCodes.length} countries
                      </span>
                    </td>
                    <td>
                      <div style={{ marginBottom: 4 }}>
                        <StatusBadge status={intake.workflowStatus} />
                      </div>
                      <RowIndicators intake={intake} />
                    </td>
                    <td>{new Date(intake.createdAt).toLocaleDateString()}</td>
                    <td>
                      <div className={styles.actions}>
                        <Link
                          href={`/admin/${lang}/rights-intakes/${intake.id}`}
                          className={styles.actionBtn}
                        >
                          View
                        </Link>
                        {intake.createdBookId && (
                          <Link
                            href={`/admin/${lang}/books/${intake.createdBookId}`}
                            className={styles.actionBtn}
                            title="Open created book"
                          >
                            Book →
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
          )}
        </>
      )}
    </div>
  );
};

function RowIndicators({ intake }: { intake: RightsIntakeListItem }) {
  const indicators: Array<{ label: string; type: 'danger' | 'warning' | 'info' | 'success' }> = [];

  const imp = intake.currentReviewImport;
  const prof = intake.currentRightsProfile;

  if (intake.workflowStatus === 'DRAFT') {
    indicators.push({ label: 'Needs agent', type: 'info' });
  } else if (intake.workflowStatus === 'READY_FOR_AGENT') {
    indicators.push({ label: 'Ready for export', type: 'info' });
  } else if (intake.workflowStatus === 'REVIEW_IMPORTED') {
    indicators.push({ label: 'Review imported', type: 'info' });
  } else if (intake.workflowStatus === 'HUMAN_REVIEW_REQUIRED') {
    indicators.push({ label: 'Human review required', type: 'warning' });
  }

  if (imp?.importStatus === 'VALIDATION_FAILED') {
    indicators.push({ label: 'Validation failed', type: 'danger' });
  }

  if (prof) {
    if (prof.publicationGate === 'BLOCK' || prof.blockedCountriesCount > 0) {
      indicators.push({ label: 'Blocked', type: 'danger' });
    }
    if (prof.overallStatus === 'LICENSE_REQUIRED' || prof.licenseRequiredCountriesCount > 0) {
      indicators.push({ label: 'License required', type: 'warning' });
    }
    if (
      prof.publicationGate === 'ALLOW_AFTER_GEO_CONFIGURATION' ||
      prof.geoBlockRequiredCount > 0
    ) {
      indicators.push({ label: 'Geo restrictions', type: 'warning' });
    }
    if (prof.blockingActionsCount > 0) {
      indicators.push({ label: 'Blocking actions', type: 'danger' });
    }
  }

  if (intake.createdBookId) {
    indicators.push({ label: 'Book created', type: 'success' });
  }

  if (indicators.length === 0) return null;

  return (
    <div className={styles.indicatorsList}>
      {indicators.map((ind, i) => (
        <span key={i} className={styles.indicatorChip} data-type={ind.type}>
          {ind.label}
        </span>
      ))}
    </div>
  );
}

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Draft',
  READY_FOR_AGENT: 'Ready For Agent',
  REVIEW_IMPORTED: 'Review Imported',
  HUMAN_REVIEW_REQUIRED: 'Human Review Required',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  BOOK_CREATED: 'Book Created',
  ARCHIVED: 'Archived',
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={styles.statusBadge} data-status={status}>
      {STATUS_LABELS[status] || status}
    </span>
  );
}
