'use client';

import { useState, type FC } from 'react';
import { Tag } from 'antd';
import { AlertCircle, ExternalLink, ShieldAlert } from 'lucide-react';
import Link from 'next/link';
import { useRightsClaims } from '@/api/hooks/useRightsClaims';
import {
  CLAIM_SEVERITY_COLORS,
  CLAIM_SEVERITY_LABELS,
  CLAIM_STATUS_LABELS,
  CLAIM_TYPE_LABELS,
  formatClaimDate,
} from '@/components/admin/rights-claims/claimLabels';
import { EmptyState, Pagination } from '@/components/admin/shared';
import { Input } from '@/components/common/Input';
import type { SupportedLang } from '@/lib/i18n/lang';
import type {
  RightsClaimSeverity,
  RightsClaimStatus,
  RightsClaimType,
} from '@/types/api-schema/rights-claims';
import styles from './RightsClaimsList.module.scss';

const STATUS_OPTIONS: Array<{ value: RightsClaimStatus | ''; label: string }> = [
  { value: '', label: 'Все статусы' },
  ...(Object.keys(CLAIM_STATUS_LABELS) as RightsClaimStatus[]).map((value) => ({
    value,
    label: CLAIM_STATUS_LABELS[value],
  })),
];

const TYPE_OPTIONS: Array<{ value: RightsClaimType | ''; label: string }> = [
  { value: '', label: 'Все типы' },
  ...(Object.keys(CLAIM_TYPE_LABELS) as RightsClaimType[]).map((value) => ({
    value,
    label: CLAIM_TYPE_LABELS[value],
  })),
];

const SEVERITY_OPTIONS: Array<{ value: RightsClaimSeverity | ''; label: string }> = [
  { value: '', label: 'Любая критичность' },
  ...(Object.keys(CLAIM_SEVERITY_LABELS) as RightsClaimSeverity[]).map((value) => ({
    value,
    label: CLAIM_SEVERITY_LABELS[value],
  })),
];

interface RightsClaimsListProps {
  lang: SupportedLang;
}

export const RightsClaimsList: FC<RightsClaimsListProps> = ({ lang }) => {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<RightsClaimStatus | ''>('');
  const [typeFilter, setTypeFilter] = useState<RightsClaimType | ''>('');
  const [severityFilter, setSeverityFilter] = useState<RightsClaimSeverity | ''>('');
  const [openOnly, setOpenOnly] = useState(false);
  const [overdueOnly, setOverdueOnly] = useState(false);

  const { data, isLoading, error } = useRightsClaims({
    page,
    limit: 20,
    q: search || undefined,
    status: statusFilter || undefined,
    claimType: typeFilter || undefined,
    severity: severityFilter || undefined,
    openOnly: openOnly || undefined,
    overdueOnly: overdueOnly || undefined,
  });

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>Rights Claims</h1>
        </div>
        <div className={styles.error}>
          <p>Не удалось загрузить претензии</p>
          <p className={styles.errorMessage}>{error.message}</p>
        </div>
      </div>
    );
  }

  const claims = data?.items ?? [];
  const totalPages = data ? Math.ceil(data.total / data.limit) : 0;
  const hasFilters = Boolean(
    search || statusFilter || typeFilter || severityFilter || openOnly || overdueOnly
  );

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Rights Claims</h1>
        <p className={styles.subtitle}>
          Претензии правообладателей и DMCA-уведомления по всем книгам.
        </p>
      </div>

      <div className={styles.toolbar}>
        <div className={styles.searchInput}>
          <Input
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Номер, заявитель, произведение…"
            value={search}
          />
        </div>
        <select
          className={styles.filterSelect}
          onChange={(e) => {
            setStatusFilter(e.target.value as RightsClaimStatus | '');
            setPage(1);
          }}
          value={statusFilter}
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <select
          className={styles.filterSelect}
          onChange={(e) => {
            setTypeFilter(e.target.value as RightsClaimType | '');
            setPage(1);
          }}
          value={typeFilter}
        >
          {TYPE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <select
          className={styles.filterSelect}
          onChange={(e) => {
            setSeverityFilter(e.target.value as RightsClaimSeverity | '');
            setPage(1);
          }}
          value={severityFilter}
        >
          {SEVERITY_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <button
          className={styles.filterToggle}
          data-active={openOnly}
          onClick={() => {
            setOpenOnly(!openOnly);
            setPage(1);
          }}
          type="button"
        >
          <ShieldAlert size={14} />
          Только открытые
        </button>
        <button
          className={styles.filterToggle}
          data-active={overdueOnly}
          onClick={() => {
            setOverdueOnly(!overdueOnly);
            setPage(1);
          }}
          type="button"
        >
          <AlertCircle size={14} />
          Только просроченные
        </button>
      </div>

      {data && (
        <div className={styles.info}>
          Показано {claims.length} из {data.total} претензий
        </div>
      )}

      {isLoading ? (
        <p className={styles.info}>Загрузка претензий…</p>
      ) : claims.length === 0 ? (
        <EmptyState
          description={
            hasFilters
              ? 'Попробуйте изменить фильтры поиска'
              : 'Претензии правообладателей ещё не поступали'
          }
          icon={<ShieldAlert />}
          title="Претензии не найдены."
        />
      ) : (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Номер</th>
                <th>Тип</th>
                <th>Статус</th>
                <th>Заявитель</th>
                <th>Страны</th>
                <th>Получена</th>
                <th>Дедлайн</th>
                <th>Блокировки</th>
                <th>Объект</th>
              </tr>
            </thead>
            <tbody>
              {claims.map((claim) => (
                <tr data-testid={`claim-list-row-${claim.id}`} key={claim.id}>
                  <td>
                    <div className={styles.claimNumber}>{claim.claimNumber}</div>
                    <Tag color={CLAIM_SEVERITY_COLORS[claim.severity]}>
                      {CLAIM_SEVERITY_LABELS[claim.severity]}
                    </Tag>
                  </td>
                  <td>{CLAIM_TYPE_LABELS[claim.claimType]}</td>
                  <td>
                    <span>{CLAIM_STATUS_LABELS[claim.status]}</span>
                    {claim.blocksPublication && claim.isOpen && (
                      <Tag color="red">Блокирует публикацию</Tag>
                    )}
                  </td>
                  <td>
                    <div>{claim.claimantName}</div>
                    {claim.claimantOrganization && (
                      <div className={styles.muted}>{claim.claimantOrganization}</div>
                    )}
                  </td>
                  <td>
                    {claim.affectedCountryCodes.length > 0
                      ? claim.affectedCountryCodes.join(', ')
                      : 'все страны'}
                  </td>
                  <td>{formatClaimDate(claim.receivedAt)}</td>
                  <td className={claim.isOverdue ? styles.overdue : undefined}>
                    {formatClaimDate(claim.deadlineAt)}
                    {claim.isOverdue && ' (просрочен)'}
                  </td>
                  <td>
                    {claim.activeBlocksCount === 0 ? (
                      '—'
                    ) : (
                      <Tag color="red">
                        {claim.hasWorldwideBlock
                          ? 'весь мир'
                          : claim.blockedCountryCodes.join(', ')}
                      </Tag>
                    )}
                  </td>
                  <td>
                    {claim.bookId ? (
                      <Link className={styles.link} href={`/admin/${lang}/books/${claim.bookId}`}>
                        <ExternalLink size={14} />
                        Книга
                      </Link>
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

      {totalPages > 1 && (
        <Pagination currentPage={page} onPageChange={setPage} totalPages={totalPages} />
      )}
    </div>
  );
};
