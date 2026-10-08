'use client';

import type { FC } from 'react';
import { Gavel, ShieldCheck } from 'lucide-react';
import { gateReasonLabel } from '@/components/admin/books/PublishPanel';
import { Button } from '@/components/admin/common/Button';
import type { RightsOverridePanelProps } from './RightsOverridePanel.types';
import type { RightsPublicationOverride } from '@/types/api-schema';
import styles from './RightsOverridePanel.module.scss';
import { RightsOverrideReasonModal } from './RightsOverrideReasonModal';
import { useRightsOverridePanel } from './useRightsOverridePanel';

const formatDateTime = (value: string | null): string =>
  value ? new Date(value).toLocaleString() : '—';

const authorOf = (email: string | null, userId: string | null): string =>
  email ?? userId ?? 'неизвестно';

const PastDecision: FC<{ item: RightsPublicationOverride }> = ({ item }) => (
  <li className={styles.historyItem}>
    <span className={styles.meta}>
      Выдано {formatDateTime(item.grantedAt)} ·{' '}
      {authorOf(item.grantedByEmail, item.grantedByUserId)}
    </span>
    <span className={styles.reason}>{item.reasonRu}</span>
    {item.revokedAt && (
      <span className={styles.meta}>
        Отменено {formatDateTime(item.revokedAt)} ·{' '}
        {authorOf(item.revokedByEmail, item.revokedByUserId)}
        {item.revokeReasonRu ? ` — ${item.revokeReasonRu}` : ''}
      </span>
    )}
  </li>
);

/**
 * Решение администратора «Разрешить публикацию» — последняя инстанция (решение владельца
 * от 27.09.2026). Ставится на книгу целиком. `content_manager` видит действующее решение,
 * но не выдаёт и не отменяет его — это право только `admin`.
 */
export const RightsOverridePanel: FC<RightsOverridePanelProps> = (props) => {
  const {
    isAdmin,
    isStaff,
    isOverrideLoading,
    isOverrideError,
    active,
    pastDecisions,
    canGrant,
    remainingBlockers,
    isGrantOpen,
    grantReason,
    grantReasonError,
    isGrantPending,
    isRevokeOpen,
    revokeReason,
    isRevokePending,
    setGrantReason,
    setRevokeReason,
    handleOpenGrant,
    handleCloseGrant,
    handleConfirmGrant,
    handleOpenRevoke,
    handleCloseRevoke,
    handleConfirmRevoke,
  } = useRightsOverridePanel(props);

  if (!isStaff || isOverrideLoading) return null;
  if (!active && !canGrant && pastDecisions.length === 0 && !isOverrideError) return null;

  return (
    <>
      <section className={styles.panel} aria-label="Решение администратора">
        <div className={styles.header}>
          <Gavel size={18} />
          <h3 className={styles.title}>Решение администратора</h3>
        </div>

        {isOverrideError && (
          <p className={styles.text}>Не удалось загрузить решение администратора по книге.</p>
        )}

        {active && (
          <div className={styles.activeSection}>
            <div className={styles.activeHeader}>
              <ShieldCheck size={16} />
              <span>Публикация книги разрешена решением администратора</span>
            </div>
            <span className={styles.meta}>
              {authorOf(active.grantedByEmail, active.grantedByUserId)} ·{' '}
              {formatDateTime(active.grantedAt)}
            </span>
            <span className={styles.reason}>{active.reasonRu}</span>
            {remainingBlockers.length > 0 && (
              <div className={styles.remaining} role="alert">
                <span className={styles.remainingTitle}>
                  Публикацию всё ещё блокирует (обычно — претензии, поданные после решения):
                </span>
                <ul className={styles.remainingList}>
                  {remainingBlockers.map((reason, index) => (
                    <li key={`${reason.code}-${index}`}>
                      {gateReasonLabel(reason.code)} <code>{reason.code}</code>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {isAdmin && (
              <Button variant="secondary" size="sm" onClick={handleOpenRevoke}>
                Отменить решение
              </Button>
            )}
          </div>
        )}

        {canGrant && (
          <div className={styles.grantSection}>
            <p className={styles.text}>
              Публикация заблокирована правовыми проверками. Администратор может снять их для всей
              книги под свою ответственность.
              {active && ' Новое решение заменит действующее.'}
            </p>
            <Button variant="danger" size="sm" fullWidth onClick={handleOpenGrant}>
              Разрешить публикацию (последняя инстанция)
            </Button>
          </div>
        )}

        {pastDecisions.length > 0 && (
          <details className={styles.history}>
            <summary className={styles.historySummary}>
              Прошлые решения ({pastDecisions.length})
            </summary>
            <ul className={styles.historyList}>
              {pastDecisions.map((item) => (
                <PastDecision key={item.id} item={item} />
              ))}
            </ul>
          </details>
        )}
      </section>

      {isAdmin && (
        <>
          <RightsOverrideReasonModal
            isOpen={isGrantOpen}
            title="Разрешить публикацию книги"
            confirmText="Разрешить публикацию"
            reasonLabel="Причина решения (обязательно, от 10 до 2000 знаков)"
            reason={grantReason}
            reasonError={grantReasonError}
            isLoading={isGrantPending}
            onReasonChange={setGrantReason}
            onConfirm={handleConfirmGrant}
            onCancel={handleCloseGrant}
          >
            <p className={styles.modalWarningText}>
              Это решение последней инстанции снимает все правовые ограничения гейта публикации для{' '}
              <strong>всех версий этой книги</strong>: профиль и проверку прав, лицензии, geo-block,
              заключения юриста и перепроверки.
            </p>
            <p className={styles.modalWarningText}>
              Не снимается только незаполненная версия (нет описания или обложки). Претензия
              правообладателя, поданная после решения, снова заблокирует публикацию.
            </p>
            {remainingBlockers.length > 0 && (
              <p className={styles.modalWarningText}>
                <strong>Новое решение снимет и блокеры, появившиеся после действующего:</strong>{' '}
                {remainingBlockers.map((reason) => gateReasonLabel(reason.code)).join('; ')}.
              </p>
            )}
            <p className={styles.modalWarningText}>
              Решение записывается в журнал вместе с вашей учётной записью и причиной.
            </p>
          </RightsOverrideReasonModal>

          <RightsOverrideReasonModal
            isOpen={isRevokeOpen}
            title="Отменить решение администратора"
            confirmText="Отменить решение"
            reasonLabel="Причина отмены (необязательно)"
            reason={revokeReason}
            reasonError={null}
            isLoading={isRevokePending}
            onReasonChange={setRevokeReason}
            onConfirm={handleConfirmRevoke}
            onCancel={handleCloseRevoke}
          >
            <p className={styles.modalWarningText}>
              Правовые проверки гейта снова начнут блокировать публикацию всех версий книги.
            </p>
          </RightsOverrideReasonModal>
        </>
      )}
    </>
  );
};
