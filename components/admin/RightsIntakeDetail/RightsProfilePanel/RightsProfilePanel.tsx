'use client';

import type { FC } from 'react';
import {
  useMaterializeRightsReviewImport,
  useCurrentRightsProfile,
} from '@/api/hooks/useRightsIntakes';
import { ContributorsPanel } from '@/components/admin/ContributorsPanel/ContributorsPanel';
import { ComponentTerritoryAssessmentsPanel } from '@/components/admin/RightsIntakeDetail/ComponentTerritoryAssessmentsPanel/ComponentTerritoryAssessmentsPanel';
import { LicensesPanel } from '@/components/admin/RightsIntakeDetail/LicensesPanel/LicensesPanel';
import { TerritoryRegionsPanel } from '@/components/admin/RightsIntakeDetail/TerritoryRegionsPanel/TerritoryRegionsPanel';
import type {
  RightsProfileDetail,
  RightsReviewImportListItem,
} from '@/types/api-schema/rights-intake';
import styles from './RightsProfilePanel.module.scss';

interface RightsProfilePanelProps {
  intakeId?: string;
  workflowStatus?: string;
  reviewImports?: RightsReviewImportListItem[];
  profile?: RightsProfileDetail | null;
}

export const RightsProfilePanel: FC<RightsProfilePanelProps> = (props) => {
  const { intakeId, workflowStatus = 'APPROVED', reviewImports = [], profile } = props;
  const {
    data: fetchedProfile,
    isLoading: profileLoading,
    error: profileError,
    refetch: refetchProfile,
  } = useCurrentRightsProfile(intakeId || '');

  const currentProfile = profile !== undefined ? profile : fetchedProfile;

  const materializeMutation = useMaterializeRightsReviewImport();

  const currentValidImport = reviewImports.find(
    (i) => i.isCurrent && i.importStatus === 'VALIDATED'
  );

  const handleBuildProfile = async () => {
    if (!currentValidImport) return;
    try {
      await materializeMutation.mutateAsync(currentValidImport.id);
      await refetchProfile();
    } catch {
      // error handled by mutation
    }
  };

  const getIndicators = () => {
    if (!currentProfile) return [];
    const ind: Array<{ label: string; type: 'danger' | 'warning' | 'info' | 'success' }> = [];

    if (currentProfile.publicationGate === 'ALLOW') {
      ind.push({ label: 'Publication Allowed', type: 'success' });
    } else if (currentProfile.publicationGate === 'BLOCK') {
      ind.push({ label: 'Blocked', type: 'danger' });
    } else if (currentProfile.publicationGate === 'ALLOW_AFTER_GEO_CONFIGURATION') {
      ind.push({ label: 'Geo Configuration Required', type: 'warning' });
    }

    if (currentProfile.overallStatus === 'LICENSE_REQUIRED') {
      ind.push({ label: 'License Required', type: 'warning' });
    }

    // Phase 15: license coverage of the markets that require a license
    const coverageStatus = currentProfile.licenseCoverage?.status;
    if (coverageStatus === 'NOT_COVERED') {
      ind.push({ label: 'Лицензия отсутствует', type: 'danger' });
    } else if (coverageStatus === 'PARTIAL') {
      ind.push({ label: 'Лицензия покрывает не все рынки', type: 'warning' });
    } else if (coverageStatus === 'COVERED') {
      ind.push({ label: 'Покрыто лицензией', type: 'success' });
    }

    if ((currentProfile.expiringSoonLicensesCount ?? 0) > 0) {
      ind.push({
        label: `Истекающие лицензии: ${currentProfile.expiringSoonLicensesCount}`,
        type: 'warning',
      });
    }

    if ((currentProfile.revokedLicensesCount ?? 0) > 0) {
      ind.push({
        label: `Отозванные лицензии: ${currentProfile.revokedLicensesCount}`,
        type: 'danger',
      });
    }

    const blockedTerritories = currentProfile.territoryDecisions.filter(
      (t) => t.finalStatus === 'BLOCKED' || t.accessPolicy === 'BLOCK'
    );
    if (blockedTerritories.length > 0) {
      ind.push({ label: `${blockedTerritories.length} Blocked Territories`, type: 'danger' });
    }

    const blockingActions = currentProfile.actions.filter(
      (a) => a.isBlocking && a.status !== 'COMPLETED' && a.status !== 'WAIVED'
    );
    if (blockingActions.length > 0) {
      ind.push({ label: `${blockingActions.length} Blocking Actions`, type: 'danger' });
    }

    if (currentProfile.confidence === 'LOW') {
      ind.push({ label: 'Low Confidence', type: 'warning' });
    }

    return ind;
  };

  const indicators = getIndicators();

  return (
    <div className={styles.section}>
      <h2 className={styles.sectionTitle}>Rights Profile</h2>
      {workflowStatus === 'REVIEW_IMPORTED' || currentProfile ? (
        <>
          {profileLoading && <p className={styles.sectionHint}>Loading rights profile...</p>}

          {profileError && !currentProfile && (
            <>
              <p className={styles.sectionHint}>
                Build a normalized rights profile from the current validated review import.
              </p>
              {currentValidImport ? (
                <div className={styles.manifestActions}>
                  <button
                    className={styles.actionBtnPrimary}
                    onClick={handleBuildProfile}
                    disabled={materializeMutation.isPending}
                  >
                    {materializeMutation.isPending ? 'Building...' : 'Build Rights Profile'}
                  </button>
                  {materializeMutation.error && (
                    <p className={styles.manifestErrorText}>
                      {materializeMutation.error instanceof Error
                        ? materializeMutation.error.message
                        : 'Failed to build profile'}
                    </p>
                  )}
                </div>
              ) : (
                <p className={styles.sectionHint}>
                  No validated review import found. Please complete a valid review import first.
                </p>
              )}
            </>
          )}

          {currentProfile && (
            <div>
              {indicators.length > 0 && (
                <div className={styles.indicatorsBar}>
                  {indicators.map((ind, i) => (
                    <span key={i} className={styles.indicatorChip} data-type={ind.type}>
                      {ind.label}
                    </span>
                  ))}
                </div>
              )}

              <div className={styles.profileStats}>
                <div className={styles.profileStat}>
                  <span className={styles.profileStatLabel}>Status</span>
                  <span className={styles.profileStatValue}>{currentProfile.status}</span>
                </div>
                <div className={styles.profileStat}>
                  <span className={styles.profileStatLabel}>Overall</span>
                  <span className={styles.profileStatValue}>{currentProfile.overallStatus}</span>
                </div>
                <div className={styles.profileStat}>
                  <span className={styles.profileStatLabel}>Gate</span>
                  <span className={styles.profileStatValue}>{currentProfile.publicationGate}</span>
                </div>
                <div className={styles.profileStat}>
                  <span className={styles.profileStatLabel}>Confidence</span>
                  <span className={styles.profileStatValue}>{currentProfile.confidence}</span>
                </div>
                <div className={styles.profileStat}>
                  <span className={styles.profileStatLabel}>Territories</span>
                  <span className={styles.profileStatValue}>
                    {currentProfile.territoryDecisions.length}
                  </span>
                </div>
                <div className={styles.profileStat}>
                  <span className={styles.profileStatLabel}>Components</span>
                  <span className={styles.profileStatValue}>
                    {currentProfile.components.length}
                  </span>
                </div>
                <div className={styles.profileStat}>
                  <span className={styles.profileStatLabel}>Actions</span>
                  <span className={styles.profileStatValue}>{currentProfile.actions.length}</span>
                </div>
                <div className={styles.profileStat}>
                  <span className={styles.profileStatLabel}>Evidence</span>
                  <span className={styles.profileStatValue}>{currentProfile.evidence.length}</span>
                </div>
              </div>

              {currentProfile.summaryRu && (
                <div className={styles.textBlock}>
                  <div className={styles.textBlockTitle}>Summary (Russian)</div>
                  <p>{currentProfile.summaryRu}</p>
                </div>
              )}

              {currentProfile.conclusionRu && (
                <div className={styles.textBlock}>
                  <div className={styles.textBlockTitle}>Conclusion (Russian)</div>
                  <p>{currentProfile.conclusionRu}</p>
                </div>
              )}

              {currentProfile.reasoningRu && (
                <details className={styles.collapsible}>
                  <summary>Detailed Reasoning (Russian)</summary>
                  <p className={styles.textBlock}>{currentProfile.reasoningRu}</p>
                </details>
              )}

              {currentProfile.sourceEdition && (
                <details className={styles.collapsible}>
                  <summary>Source Edition Metadata</summary>
                  <div className={styles.sourceMetadata}>
                    <p>Provider: {currentProfile.sourceEdition.provider}</p>
                    {currentProfile.sourceEdition.externalId && (
                      <p>External ID: {currentProfile.sourceEdition.externalId}</p>
                    )}
                    {currentProfile.sourceEdition.sourceTitle && (
                      <p>Source Title: {currentProfile.sourceEdition.sourceTitle}</p>
                    )}
                    {currentProfile.sourceEdition.sourceUrl && (
                      <p>
                        URL:{' '}
                        <a
                          href={currentProfile.sourceEdition.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {currentProfile.sourceEdition.sourceUrl}
                        </a>
                      </p>
                    )}
                  </div>
                </details>
              )}

              {currentProfile.regionalTerritorySummary &&
                currentProfile.regionalTerritorySummary.length > 0 && (
                  <div className={styles.regionsPanel}>
                    <TerritoryRegionsPanel regions={currentProfile.regionalTerritorySummary} />
                  </div>
                )}

              <details
                className={styles.collapsible}
                open={
                  !currentProfile.regionalTerritorySummary ||
                  currentProfile.regionalTerritorySummary.length === 0
                }
              >
                <summary>
                  Raw Country Decisions ({currentProfile.territoryDecisions.length})
                </summary>
                {currentProfile.territoryDecisions.length > 0 ? (
                  <table className={styles.profileTable}>
                    <thead>
                      <tr>
                        <th>Country</th>
                        <th>Status</th>
                        <th>Access Policy</th>
                        <th>Geo Block</th>
                        <th>Confidence</th>
                        <th>Reason</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentProfile.territoryDecisions.map((td) => (
                        <tr
                          key={td.id}
                          className={
                            td.finalStatus === 'BLOCKED' || td.accessPolicy === 'BLOCK'
                              ? styles.blockingRow
                              : ''
                          }
                        >
                          <td>{td.countryCode}</td>
                          <td>{td.finalStatus}</td>
                          <td>{td.accessPolicy}</td>
                          <td>{td.geoBlockRequired ? 'Yes' : 'No'}</td>
                          <td>{td.confidence}</td>
                          <td>{td.reasonRu}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className={styles.profileEmpty}>No territory decisions.</p>
                )}
              </details>

              <ComponentTerritoryAssessmentsPanel components={currentProfile.components} />

              <LicensesPanel
                components={currentProfile.components}
                coverage={currentProfile.licenseCoverage}
                licenses={currentProfile.licenses}
                rightsProfileId={currentProfile.id}
              />

              <ContributorsPanel
                profileContributors={currentProfile.contributors}
                sourceEditionId={currentProfile.sourceEdition?.id}
              />

              <details className={styles.collapsible} open>
                <summary>Required Actions ({currentProfile.actions.length})</summary>
                {currentProfile.actions.length > 0 ? (
                  <table className={styles.profileTable}>
                    <thead>
                      <tr>
                        <th>Type</th>
                        <th>Status</th>
                        <th>Blocking</th>
                        <th>Description</th>
                        <th>Countries</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentProfile.actions.map((a) => (
                        <tr key={a.id} className={a.isBlocking ? styles.blockingRow : ''}>
                          <td>{a.actionType}</td>
                          <td>{a.status}</td>
                          <td>{a.isBlocking ? 'Yes' : 'No'}</td>
                          <td>{a.descriptionRu}</td>
                          <td>
                            {Array.isArray(a.affectedCountryCodes)
                              ? (a.affectedCountryCodes as string[]).join(', ')
                              : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className={styles.profileEmpty}>No required actions.</p>
                )}
              </details>

              <details className={styles.collapsible}>
                <summary>Evidence ({currentProfile.evidence.length})</summary>
                {currentProfile.evidence.length > 0 ? (
                  <div className={styles.evidenceList}>
                    {currentProfile.evidence.map((e) => (
                      <div key={e.id} className={styles.evidenceItem}>
                        <div className={styles.evidenceHeader}>
                          <span>{e.evidenceType}</span>
                          <span>{e.sourceLevel}</span>
                        </div>
                        <p className={styles.evidenceTitle}>{e.title}</p>
                        <p className={styles.evidenceAuthority}>{e.authority}</p>
                        {e.summaryRu && <p className={styles.evidenceAuthority}>{e.summaryRu}</p>}
                        {e.url && (
                          <a
                            href={e.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={styles.evidenceUrl}
                          >
                            {e.url}
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className={styles.profileEmpty}>No evidence.</p>
                )}
              </details>
            </div>
          )}
        </>
      ) : (
        <p className={styles.sectionHint}>
          Rights profile will be available after a validated review import is materialized.
        </p>
      )}
    </div>
  );
};
