'use client';

import { useState } from 'react';
import type { FC } from 'react';
import { Button, Popconfirm, Tag } from 'antd';
import { Eye, Plus, ShieldAlert, ShieldOff } from 'lucide-react';
import { useApplyClaimBlock, useVersionRightsClaims } from '@/api/hooks/useRightsClaims';
import {
  CLAIM_SEVERITY_COLORS,
  CLAIM_SEVERITY_LABELS,
  CLAIM_STATUS_LABELS,
  CLAIM_TYPE_LABELS,
  formatClaimDate,
} from '@/components/admin/rights-claims/claimLabels';
import type { RightsClaimSummary } from '@/types/api-schema/rights-claims';
import { RightsClaimDetailDrawer } from './RightsClaimDetailDrawer';
import { RightsClaimFormModal } from './RightsClaimFormModal';
import styles from './RightsClaimsPanel.module.scss';
import { RightsClaimsSummary } from './RightsClaimsSummary';

export interface RightsClaimsPanelProps {
  versionId: string;
  bookId: string;
  readOnly?: boolean;
}

export const RightsClaimsPanel: FC<RightsClaimsPanelProps> = ({
  versionId,
  bookId,
  readOnly = false,
}) => {
  const { data, isError } = useVersionRightsClaims(versionId);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [openClaimId, setOpenClaimId] = useState<string | null>(null);

  const applyBlockMutation = useApplyClaimBlock();

  const claims = data?.items ?? [];
  const total = data ? data.pagination.total : null;

  const handleQuickBlock = (claim: RightsClaimSummary) => {
    applyBlockMutation.mutate({
      id: claim.id,
      data: {
        scope: 'LANGUAGE_EDITION',
        bookVersionId: claim.bookVersionId ?? versionId,
        reasonRu: `Временная блокировка по претензии ${claim.claimNumber}.`,
        unpublishVersion: true,
      },
    });
  };

  const renderClaims = () => {
    if (!data) {
      return (
        <p className={styles.empty}>
          {isError ? 'Список претензий не загрузился. Обновите страницу.' : 'Загрузка претензий…'}
        </p>
      );
    }
    if (claims.length === 0) {
      return (
        <p className={styles.empty}>
          По этой версии не зарегистрировано ни одной претензии правообладателей.
        </p>
      );
    }
    return (
      <div className={styles.tableScroll}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Номер</th>
              <th>Тип</th>
              <th>Статус</th>
              <th>Заявитель</th>
              <th>Страны</th>
              <th>Дедлайн</th>
              <th>Блокировки</th>
              {!readOnly && <th>Действия</th>}
            </tr>
          </thead>
          <tbody>
            {claims.map((claim) => (
              <tr data-testid={`claim-row-${claim.id}`} key={claim.id}>
                <td>
                  <div className={styles.claimNumber}>{claim.claimNumber}</div>
                  <Tag color={CLAIM_SEVERITY_COLORS[claim.severity]}>
                    {CLAIM_SEVERITY_LABELS[claim.severity]}
                  </Tag>
                </td>
                <td>{CLAIM_TYPE_LABELS[claim.claimType]}</td>
                <td>
                  <span className={styles.statusText}>{CLAIM_STATUS_LABELS[claim.status]}</span>
                  {claim.blocksPublication && claim.isOpen && (
                    <Tag color="red">Блокирует публикацию</Tag>
                  )}
                </td>
                <td>
                  <div>{claim.claimantName}</div>
                  {claim.claimantOrganization && (
                    <div className={styles.mutedCell}>{claim.claimantOrganization}</div>
                  )}
                </td>
                <td>
                  {claim.affectedCountryCodes.length > 0
                    ? claim.affectedCountryCodes.join(', ')
                    : 'все страны'}
                </td>
                <td>
                  <span
                    className={claim.isOverdue ? styles.deadlineOverdue : undefined}
                    data-testid={claim.isOverdue ? `claim-overdue-${claim.id}` : undefined}
                  >
                    {formatClaimDate(claim.deadlineAt)}
                    {claim.isOverdue && ' (просрочен)'}
                  </span>
                </td>
                <td>
                  {claim.activeBlocksCount === 0 ? (
                    '—'
                  ) : (
                    <Tag color="red">
                      {claim.hasWorldwideBlock ? 'весь мир' : claim.blockedCountryCodes.join(', ')}
                    </Tag>
                  )}
                </td>
                {!readOnly && (
                  <td>
                    <div className={styles.rowActions}>
                      <Button
                        icon={<Eye size={14} />}
                        onClick={() => setOpenClaimId(claim.id)}
                        size="small"
                      >
                        Открыть
                      </Button>
                      {claim.isOpen && claim.activeBlocksCount === 0 && (
                        <Popconfirm
                          cancelText="Отмена"
                          okText="Заблокировать"
                          onConfirm={() => handleQuickBlock(claim)}
                          title="Заблокировать доступ к версии и снять её с публикации?"
                        >
                          <Button danger icon={<ShieldOff size={14} />} size="small">
                            Заблокировать доступ
                          </Button>
                        </Popconfirm>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <details className={styles.panel} open>
      <summary className={styles.title}>
        <ShieldAlert aria-hidden="true" size={16} />
        <span>Претензии и DMCA ({total ?? '—'})</span>
      </summary>

      <RightsClaimsSummary claims={claims} isError={isError} total={total} />

      {!readOnly && (
        <div className={styles.actions}>
          <Button
            icon={<Plus size={14} />}
            onClick={() => setIsFormOpen(true)}
            size="small"
            type="primary"
          >
            Зарегистрировать претензию
          </Button>
        </div>
      )}

      {renderClaims()}

      <RightsClaimFormModal
        bookId={bookId}
        onClose={() => setIsFormOpen(false)}
        open={isFormOpen}
        versionId={versionId}
      />

      {openClaimId && (
        <RightsClaimDetailDrawer
          claimId={openClaimId}
          onClose={() => setOpenClaimId(null)}
          open
          readOnly={readOnly}
        />
      )}
    </details>
  );
};
