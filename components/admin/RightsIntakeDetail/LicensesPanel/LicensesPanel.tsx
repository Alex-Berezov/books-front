import { useState } from 'react';
import type { FC } from 'react';
import { Button, Popconfirm, Select, Tag } from 'antd';
import { FileCheck2, Link2, Pencil, Plus, ShieldOff } from 'lucide-react';
import { useLinkRightsLicense, useRevokeRightsLicense } from '@/api/hooks/useRightsLicenses';
import type { RightsComponent } from '@/types/api-schema/rights-intake';
import type {
  LicenseCoverageResult,
  LicenseCoverageStatus,
  RightsLicenseStatus,
  RightsLicenseSummary,
} from '@/types/api-schema/rights-licenses';
import { LicenseFormModal } from './LicenseFormModal';
import styles from './LicensesPanel.module.scss';

export interface LicensesPanelProps {
  rightsProfileId?: string;
  licenses?: RightsLicenseSummary[];
  coverage?: LicenseCoverageResult | null;
  /** Components offered in the "link to component" selector. */
  components?: RightsComponent[];
  readOnly?: boolean;
}

const EXPIRING_SOON_DAYS = 90;
const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

const STATUS_LABELS: Record<RightsLicenseStatus, string> = {
  DRAFT: 'Черновик',
  PENDING: 'Ожидает',
  ACTIVE: 'Действует',
  EXPIRED: 'Истекла',
  REVOKED: 'Отозвана',
  UNCERTAIN: 'Неопределённая',
  SUPERSEDED: 'Заменена',
};

const STATUS_COLORS: Record<RightsLicenseStatus, string> = {
  DRAFT: 'default',
  PENDING: 'blue',
  ACTIVE: 'green',
  EXPIRED: 'orange',
  REVOKED: 'red',
  UNCERTAIN: 'gold',
  SUPERSEDED: 'default',
};

const COVERAGE_LABELS: Record<LicenseCoverageStatus, string> = {
  NOT_REQUIRED: 'Лицензии не требуются',
  COVERED: 'Все рынки покрыты лицензией',
  PARTIAL: 'Лицензия покрывает не все рынки',
  NOT_COVERED: 'Лицензия отсутствует',
};

const COVERAGE_CLASSES: Record<LicenseCoverageStatus, string> = {
  NOT_REQUIRED: styles.coverageNeutral,
  COVERED: styles.coverageOk,
  PARTIAL: styles.coverageWarning,
  NOT_COVERED: styles.coverageDanger,
};

const formatDate = (value: string | null): string =>
  value ? new Date(value).toISOString().slice(0, 10) : '—';

const formatTerritory = (license: RightsLicenseSummary): string => {
  switch (license.territoryScope) {
    case 'WORLDWIDE':
      return 'Весь мир';
    case 'COUNTRY_LIST':
      return license.countryCodes.join(', ') || '—';
    case 'EXCEPT_COUNTRY_LIST':
      return `кроме ${license.excludedCountryCodes.join(', ') || '—'}`;
    default:
      return 'Не определена';
  }
};

const isExpiringSoon = (license: RightsLicenseSummary): boolean => {
  if (license.isPerpetual || !license.expiresAt) return false;
  if (license.effectiveStatus !== 'ACTIVE') return false;
  const expiresAt = new Date(license.expiresAt).getTime();
  const now = Date.now();
  return expiresAt >= now && expiresAt <= now + EXPIRING_SOON_DAYS * MILLISECONDS_PER_DAY;
};

const conditionChips = (license: RightsLicenseSummary): string[] => {
  const chips: string[] = [];
  if (license.commercialUseAllowed) chips.push('Коммерческое');
  if (license.translationAllowed) chips.push('Перевод');
  if (license.modificationAllowed) chips.push('Модификация');
  if (license.sublicensingAllowed) chips.push('Сублицензирование');
  if (license.attributionRequired) chips.push('Атрибуция');
  if (license.exclusive) chips.push('Эксклюзив');
  return chips;
};

export const LicensesPanel: FC<LicensesPanelProps> = ({
  rightsProfileId,
  licenses = [],
  coverage,
  components = [],
  readOnly = false,
}) => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editedLicense, setEditedLicense] = useState<RightsLicenseSummary | undefined>();
  const [linkTargets, setLinkTargets] = useState<Record<string, string>>({});

  const linkMutation = useLinkRightsLicense();
  const revokeMutation = useRevokeRightsLicense();

  const activeCount = licenses.filter((l) => l.effectiveStatus === 'ACTIVE').length;
  const expiredCount = licenses.filter((l) => l.effectiveStatus === 'EXPIRED').length;
  const revokedCount = licenses.filter((l) => l.effectiveStatus === 'REVOKED').length;
  const expiringSoonCount = licenses.filter(isExpiringSoon).length;

  const openCreate = () => {
    setEditedLicense(undefined);
    setIsFormOpen(true);
  };

  const openEdit = (license: RightsLicenseSummary) => {
    setEditedLicense(license);
    setIsFormOpen(true);
  };

  const handleCreated = (licenseId: string) => {
    if (!rightsProfileId) return;
    linkMutation.mutate({
      id: licenseId,
      data: { linkType: 'RIGHTS_PROFILE', rightsProfileId },
    });
  };

  const handleLinkComponent = (licenseId: string) => {
    const rightsComponentId = linkTargets[licenseId];
    if (!rightsComponentId) return;
    linkMutation.mutate({
      id: licenseId,
      data: { linkType: 'RIGHTS_COMPONENT', rightsComponentId },
    });
  };

  const handleRevoke = (licenseId: string) => {
    revokeMutation.mutate({
      id: licenseId,
      data: { reasonRu: 'Отозвано редактором в админке.' },
    });
  };

  return (
    <details className={styles.panel} open>
      <summary className={styles.title}>
        <FileCheck2 aria-hidden="true" size={16} />
        <span>Лицензии и разрешения ({licenses.length})</span>
      </summary>

      <div className={styles.metrics} aria-label="Метрики лицензий">
        <span>Всего: {licenses.length}</span>
        <span>Активных: {activeCount}</span>
        <span>Истекают (≤90 дней): {expiringSoonCount}</span>
        <span>Истёкших: {expiredCount}</span>
        <span>Отозванных: {revokedCount}</span>
      </div>

      {coverage && (
        <div className={`${styles.coverage} ${COVERAGE_CLASSES[coverage.status]}`} role="status">
          <strong>{COVERAGE_LABELS[coverage.status]}</strong>
          {coverage.uncoveredCountryCodes.length > 0 && (
            <span>Непокрытые страны: {coverage.uncoveredCountryCodes.join(', ')}</span>
          )}
        </div>
      )}

      {!readOnly && (
        <div className={styles.actions}>
          <Button icon={<Plus size={14} />} onClick={openCreate} size="small" type="primary">
            Добавить лицензию
          </Button>
        </div>
      )}

      {licenses.length === 0 ? (
        <p className={styles.empty}>
          Лицензии не привязаны. Для public domain-публикаций это нормально.
        </p>
      ) : (
        <div className={styles.tableScroll}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Название</th>
                <th>Тип</th>
                <th>Статус</th>
                <th>Лицензиар</th>
                <th>Территория</th>
                <th>Языки</th>
                <th>Форматы</th>
                <th>Срок</th>
                <th>Условия</th>
                {!readOnly && <th>Действия</th>}
              </tr>
            </thead>
            <tbody>
              {licenses.map((license) => (
                <tr data-testid={`license-row-${license.id}`} key={license.id}>
                  <td>
                    <div className={styles.licenseTitle}>{license.title}</div>
                    {license.licenseKey && (
                      <div className={styles.licenseKey}>{license.licenseKey}</div>
                    )}
                  </td>
                  <td>{license.licenseType}</td>
                  <td>
                    <Tag color={STATUS_COLORS[license.effectiveStatus]}>
                      {STATUS_LABELS[license.effectiveStatus]}
                    </Tag>
                    {isExpiringSoon(license) && <Tag color="orange">Истекает</Tag>}
                  </td>
                  <td>{license.licensor}</td>
                  <td>{formatTerritory(license)}</td>
                  <td>{license.languageCodes.join(', ') || 'все'}</td>
                  <td>{license.mediaFormats.join(', ') || 'все'}</td>
                  <td>
                    {license.isPerpetual
                      ? 'бессрочно'
                      : `${formatDate(license.effectiveFrom)} — ${formatDate(license.expiresAt)}`}
                  </td>
                  <td>
                    <div className={styles.chips}>
                      {conditionChips(license).map((chip) => (
                        <span className={styles.chip} key={chip}>
                          {chip}
                        </span>
                      ))}
                    </div>
                  </td>
                  {!readOnly && (
                    <td>
                      <div className={styles.rowActions}>
                        <Button
                          icon={<Pencil size={14} />}
                          onClick={() => openEdit(license)}
                          size="small"
                        >
                          Изменить
                        </Button>

                        {components.length > 0 && (
                          <div className={styles.linkControl}>
                            <Select
                              allowClear
                              className={styles.componentSelect}
                              onChange={(value: string | undefined) =>
                                setLinkTargets((prev) => ({ ...prev, [license.id]: value ?? '' }))
                              }
                              options={components.map((component) => ({
                                label: component.titleRu,
                                value: component.id,
                              }))}
                              placeholder="Компонент"
                              size="small"
                              value={linkTargets[license.id] || undefined}
                            />
                            <Button
                              disabled={!linkTargets[license.id]}
                              icon={<Link2 size={14} />}
                              onClick={() => handleLinkComponent(license.id)}
                              size="small"
                            >
                              Привязать
                            </Button>
                          </div>
                        )}

                        {license.effectiveStatus !== 'REVOKED' && (
                          <Popconfirm
                            cancelText="Отмена"
                            okText="Отозвать"
                            onConfirm={() => handleRevoke(license.id)}
                            title="Отозвать лицензию? Действие необратимо."
                          >
                            <Button danger icon={<ShieldOff size={14} />} size="small">
                              Отозвать
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
      )}

      {licenses.map((license) => (
        <details className={styles.details} key={`details-${license.id}`}>
          <summary>{license.title} — подробности</summary>
          <dl className={styles.detailsList}>
            <dt>Правообладатель</dt>
            <dd>{license.rightsHolder ?? '—'}</dd>
            <dt>Номер договора</dt>
            <dd>{license.referenceNumber ?? '—'}</dd>
            <dt>Текст атрибуции</dt>
            <dd>{license.requiredAttributionText ?? '—'}</dd>
            <dt>Причина отзыва</dt>
            <dd>{license.revocationReasonRu ?? '—'}</dd>
          </dl>
        </details>
      ))}

      <LicenseFormModal
        license={editedLicense}
        onClose={() => setIsFormOpen(false)}
        onCreated={handleCreated}
        open={isFormOpen}
        rightsProfileId={rightsProfileId}
      />
    </details>
  );
};
