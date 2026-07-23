'use client';

import { useState, type FC } from 'react';
import { ClipboardList, Plus } from 'lucide-react';
import Link from 'next/link';
import { useRightsIntakes } from '@/api/hooks/useRightsIntakes';
import { EmptyState, Pagination } from '@/components/admin/shared';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import type { SupportedLang } from '@/lib/i18n/lang';
import type { RightsIntakeStatus } from '@/types/api-schema/rights-intake';
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

interface RightsIntakeListProps {
  lang: SupportedLang;
}

export const RightsIntakeList: FC<RightsIntakeListProps> = ({ lang }) => {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<RightsIntakeStatus | ''>('');

  const { data, isLoading, error } = useRightsIntakes({
    page,
    limit: 20,
    status: statusFilter || undefined,
    q: search || undefined,
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
            placeholder="Search by title, author, source..."
          />
        </div>
        <select
          className={styles.statusSelect}
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
                <th>Title</th>
                <th>Author</th>
                <th>Source</th>
                <th>Languages</th>
                <th>Countries</th>
                <th>Status</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 8 }).map((_, j) => (
                    <td key={j} style={{ opacity: 0.3 }}>
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
          title="No rights intakes yet."
          description={
            search || statusFilter
              ? 'Try adjusting your search or filter'
              : 'Start by creating a new rights intake'
          }
          icon={<ClipboardList />}
          action={
            !search && !statusFilter ? (
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
                  <th>Title</th>
                  <th>Author</th>
                  <th>Source</th>
                  <th>Languages</th>
                  <th>Countries</th>
                  <th>Status</th>
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
                    </td>
                    <td>{intake.candidateAuthor}</td>
                    <td>
                      {intake.sourceProvider !== 'UNKNOWN'
                        ? `${intake.sourceProvider}${intake.sourceExternalId ? ` #${intake.sourceExternalId}` : ''}`
                        : '-'}
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
                      <StatusBadge status={intake.workflowStatus} />
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
