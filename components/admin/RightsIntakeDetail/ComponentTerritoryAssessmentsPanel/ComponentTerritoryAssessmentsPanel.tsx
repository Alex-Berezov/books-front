import type { FC } from 'react';
import type {
  ComponentTerritoryAssessment,
  RightsComponent,
} from '@/types/api-schema/rights-intake';
import styles from './ComponentTerritoryAssessmentsPanel.module.scss';

interface ComponentTerritoryAssessmentsPanelProps {
  components: RightsComponent[];
}

const EXPIRING_SOON_DAYS = 180;
const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

const isExpiringSoon = (rightsExpireAt: string | null): boolean => {
  if (!rightsExpireAt) return false;

  const expiresAt = new Date(rightsExpireAt).getTime();
  const now = Date.now();
  const threshold = now + EXPIRING_SOON_DAYS * MILLISECONDS_PER_DAY;

  return expiresAt >= now && expiresAt <= threshold;
};

const formatDate = (value: string | null): string => {
  if (!value) return '-';
  return new Date(value).toISOString().slice(0, 10);
};

const getRowClassName = (assessment: ComponentTerritoryAssessment): string => {
  if (assessment.accessPolicy === 'BLOCK' || assessment.geoBlockRequired) {
    return styles.blockingRow;
  }
  if (assessment.accessPolicy === 'REVIEW_REQUIRED') {
    return styles.warningRow;
  }
  return '';
};

export const ComponentTerritoryAssessmentsPanel: FC<ComponentTerritoryAssessmentsPanelProps> = (
  props
) => {
  const { components } = props;
  const assessments = components.flatMap((component) => component.territoryAssessments ?? []);
  const blockedCount = assessments.filter(
    (assessment) => assessment.accessPolicy === 'BLOCK'
  ).length;
  const reviewRequiredCount = assessments.filter(
    (assessment) => assessment.accessPolicy === 'REVIEW_REQUIRED'
  ).length;
  const geoBlockRequiredCount = assessments.filter(
    (assessment) => assessment.geoBlockRequired
  ).length;
  const expiringSoonCount = assessments.filter((assessment) =>
    isExpiringSoon(assessment.rightsExpireAt)
  ).length;

  return (
    <details className={styles.panel} open>
      <summary>Components ({components.length})</summary>

      <div className={styles.summary} aria-label="Component territory assessment summary">
        <span>Total assessments: {assessments.length}</span>
        <span>Blocked: {blockedCount}</span>
        <span>Review required: {reviewRequiredCount}</span>
        <span>Geo-block required: {geoBlockRequiredCount}</span>
        <span>Expiring soon: {expiringSoonCount}</span>
      </div>

      {components.length > 0 ? (
        <div className={styles.componentList}>
          {components.map((component) => {
            const territoryAssessments = component.territoryAssessments ?? [];

            return (
              <details className={styles.component} key={component.id}>
                <summary className={styles.componentSummary}>
                  <span>{component.titleRu}</span>
                  <span>{component.componentType}</span>
                  <span>{component.status}</span>
                  <span>{component.requiredAction}</span>
                  <span>{component.confidence}</span>
                </summary>

                <div className={styles.tableScroll}>
                  {territoryAssessments.length > 0 ? (
                    <table className={styles.table}>
                      <thead>
                        <tr>
                          <th>Country</th>
                          <th>Status</th>
                          <th>Access policy</th>
                          <th>Geo block</th>
                          <th>Confidence</th>
                          <th>Public domain from</th>
                          <th>Expires</th>
                          <th>Reason</th>
                          <th>Evidence IDs</th>
                        </tr>
                      </thead>
                      <tbody>
                        {territoryAssessments.map((assessment) => (
                          <tr
                            className={getRowClassName(assessment)}
                            data-testid={`component-territory-${assessment.countryCode}`}
                            key={assessment.id}
                          >
                            <td>{assessment.countryCode}</td>
                            <td>{assessment.status}</td>
                            <td>{assessment.accessPolicy}</td>
                            <td>{assessment.geoBlockRequired ? 'Yes' : 'No'}</td>
                            <td>{assessment.confidence ?? component.confidence}</td>
                            <td>{assessment.publicDomainFromYear ?? '-'}</td>
                            <td>
                              {formatDate(assessment.rightsExpireAt)}
                              {isExpiringSoon(assessment.rightsExpireAt) && (
                                <span className={styles.warningChip}>Expires soon</span>
                              )}
                            </td>
                            <td>{assessment.reasonRu ?? '-'}</td>
                            <td>
                              {assessment.sourceEvidenceIds?.length ? (
                                <ul className={styles.evidenceIds}>
                                  {assessment.sourceEvidenceIds.map((evidenceId) => (
                                    <li key={evidenceId}>{evidenceId}</li>
                                  ))}
                                </ul>
                              ) : (
                                '-'
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <p className={styles.empty}>No country assessments.</p>
                  )}
                </div>
              </details>
            );
          })}
        </div>
      ) : (
        <p className={styles.empty}>No components.</p>
      )}
    </details>
  );
};
