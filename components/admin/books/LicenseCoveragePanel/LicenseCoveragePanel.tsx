'use client';

import { type FC } from 'react';
import { Button, Tag } from 'antd';
import { Copy, RefreshCw, Scale } from 'lucide-react';
import { useVersionLicenseCoverage } from '@/api/hooks/useRightsLicenses';
import type { LicenseCoverageStatus, LicenseIssue } from '@/types/api-schema/rights-licenses';
import styles from './LicenseCoveragePanel.module.scss';

export interface LicenseCoveragePanelProps {
  versionId: string;
}

const COVERAGE_LABELS: Record<LicenseCoverageStatus, string> = {
  NOT_REQUIRED: 'Лицензии для публикации не требуются',
  COVERED: 'Все рынки покрыты действующей лицензией',
  PARTIAL: 'Лицензия покрывает не все рынки',
  NOT_COVERED: 'Действующая лицензия отсутствует',
};

const COVERAGE_COLORS: Record<LicenseCoverageStatus, string> = {
  NOT_REQUIRED: 'default',
  COVERED: 'green',
  PARTIAL: 'orange',
  NOT_COVERED: 'red',
};

const IssueList: FC<{ issues: LicenseIssue[]; title: string }> = ({ issues, title }) => {
  if (issues.length === 0) return null;
  return (
    <div className={styles.issues}>
      <h4 className={styles.issuesTitle}>{title}</h4>
      <ul className={styles.issuesList}>
        {issues.map((issue, index) => (
          <li key={`${issue.code}-${issue.countryCode ?? index}`}>
            <code className={styles.code}>{issue.code}</code> {issue.messageRu}
          </li>
        ))}
      </ul>
    </div>
  );
};

export const LicenseCoveragePanel: FC<LicenseCoveragePanelProps> = ({ versionId }) => {
  const { data: coverage, isLoading, isError, refetch } = useVersionLicenseCoverage(versionId);

  const copyAttribution = async (text: string) => {
    await navigator.clipboard.writeText(text);
  };

  if (isLoading) {
    return <p className={styles.hint}>Проверка покрытия лицензиями...</p>;
  }

  if (isError || !coverage) {
    return (
      <div className={styles.error}>
        <span>Не удалось загрузить покрытие лицензиями.</span>
        <Button icon={<RefreshCw size={14} />} onClick={() => refetch()} size="small">
          Повторить
        </Button>
      </div>
    );
  }

  if (coverage.status === 'NOT_REQUIRED') {
    return <p className={styles.hint}>{COVERAGE_LABELS.NOT_REQUIRED}</p>;
  }

  return (
    <section className={styles.panel}>
      <header className={styles.header}>
        <h3 className={styles.title}>
          <Scale aria-hidden="true" size={16} />
          <span>Покрытие лицензиями</span>
        </h3>
        <div className={styles.headerActions}>
          <Tag color={COVERAGE_COLORS[coverage.status]}>{COVERAGE_LABELS[coverage.status]}</Tag>
          <Button icon={<RefreshCw size={14} />} onClick={() => refetch()} size="small">
            Обновить проверку
          </Button>
        </div>
      </header>

      <div className={styles.tableScroll}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Страна</th>
              <th>Покрыта</th>
              <th>Лицензии</th>
              <th>Причина</th>
            </tr>
          </thead>
          <tbody>
            {coverage.countries.map((country) => (
              <tr
                className={country.covered ? '' : styles.uncoveredRow}
                data-testid={`license-coverage-${country.countryCode}`}
                key={country.countryCode}
              >
                <td>{country.countryCode}</td>
                <td>{country.covered ? 'Да' : 'Нет'}</td>
                <td>{country.licenseIds.join(', ') || '—'}</td>
                <td>{country.issues.map((issue) => issue.messageRu).join(' ') || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <IssueList issues={coverage.blockers} title="Блокеры публикации" />
      <IssueList issues={coverage.warnings} title="Предупреждения" />

      {coverage.attributionTextsRu.length > 0 && (
        <div className={styles.attribution}>
          <h4 className={styles.issuesTitle}>Требуемая атрибуция</h4>
          {coverage.attributionTextsRu.map((text) => (
            <div className={styles.attributionRow} key={text}>
              <span>{text}</span>
              <Button
                icon={<Copy size={14} />}
                onClick={() => void copyAttribution(text)}
                size="small"
              >
                Копировать
              </Button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};
