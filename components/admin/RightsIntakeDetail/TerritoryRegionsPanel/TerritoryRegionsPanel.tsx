'use client';

import { useState, type FC } from 'react';
import { Globe, ChevronDown, ChevronRight, AlertTriangle, ShieldAlert } from 'lucide-react';
import type { TerritoryRegionSummary } from '@/types/api-schema/rights-intake';
import styles from './TerritoryRegionsPanel.module.scss';

export interface TerritoryRegionsPanelProps {
  regions: TerritoryRegionSummary[];
  /** WP-C.5: целевые страны версии — план публикации, по которому считается вторая доля. */
  targetCountryCodes?: string[];
  title?: string;
}

export const TerritoryRegionsPanel: FC<TerritoryRegionsPanelProps> = ({
  regions,
  targetCountryCodes = [],
  title = 'Regions & Countries',
}) => {
  const [openRegions, setOpenRegions] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    for (const r of regions) {
      if (r.status !== 'NOT_TARGETED') {
        initial[r.regionCode] = true;
      }
    }
    return initial;
  });

  const toggleRegion = (code: string) => {
    setOpenRegions((prev) => ({
      ...prev,
      [code]: !prev[code],
    }));
  };

  if (!regions || regions.length === 0) {
    return null;
  }

  const blockedRegionsCount = regions.filter((r) => r.status === 'BLOCKED').length;
  const licenseRequiredRegionsCount = regions.filter((r) => r.status === 'LICENSE_REQUIRED').length;
  const mixedRegionsCount = regions.filter((r) => r.status === 'MIXED').length;
  const pendingReviewRegionsCount = regions.filter((r) => r.status === 'PENDING_REVIEW').length;
  const totalGeoBlockCount = regions.reduce((acc, r) => acc + r.geoBlockRequiredCount, 0);
  const targetCountrySet = new Set(targetCountryCodes.map((code) => code.toUpperCase()));

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>
        <Globe size={18} />
        {title}
      </h2>

      {/* Top Metrics Summary */}
      <div className={styles.metricsBar}>
        <div className={styles.metricCard}>
          <span className={styles.metricLabel}>Blocked Regions</span>
          <span className={styles.metricValue}>{blockedRegionsCount}</span>
        </div>
        <div className={styles.metricCard}>
          <span className={styles.metricLabel}>License Required</span>
          <span className={styles.metricValue}>{licenseRequiredRegionsCount}</span>
        </div>
        <div className={styles.metricCard}>
          <span className={styles.metricLabel}>Mixed Regions</span>
          <span className={styles.metricValue}>{mixedRegionsCount}</span>
        </div>
        <div className={styles.metricCard}>
          <span className={styles.metricLabel}>Pending Review</span>
          <span className={styles.metricValue}>{pendingReviewRegionsCount}</span>
        </div>
        <div className={styles.metricCard}>
          <span className={styles.metricLabel}>Geo-block Required</span>
          <span className={styles.metricValue}>{totalGeoBlockCount}</span>
        </div>
      </div>

      {/* Region Accordions */}
      <div className={styles.regionList}>
        {regions.map((region) => {
          const isOpen = Boolean(openRegions[region.regionCode]);
          const hasBlockingReasons = region.blockingReasons && region.blockingReasons.length > 0;

          return (
            <div
              key={region.regionCode}
              className={styles.regionCard}
              data-open={isOpen ? 'true' : 'false'}
            >
              <div className={styles.regionHeader} onClick={() => toggleRegion(region.regionCode)}>
                <div className={styles.regionTitleGroup}>
                  {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  <span className={styles.regionLabel}>{region.label}</span>
                  <span className={styles.badge} data-status={region.status}>
                    {region.status}
                  </span>
                </div>
                <div className={styles.regionStats}>
                  {region.status === 'NOT_TARGETED' ? (
                    <span className={styles.mutedText}>
                      Not targeted ({region.countryCount} countries)
                    </span>
                  ) : (
                    <>
                      {/* WP-10.8 (R7-04): статус региона считается только по оценённым
                          странам, поэтому рядом обязано стоять «сколько из скольких» —
                          иначе «European Union [ALLOWED] · Targeted: 3» прячет 24
                          непроверенные страны. */}
                      <span>
                        Targeted: {region.targetedCountryCount} / {region.countryCount}
                      </span>
                      {/* WP-C.5: вторая доля — по плану публикации. Она стоит рядом с долей
                          по справочнику региона, а не вместо неё: зелёным регион делает
                          только полное покрытие справочника (R6-04). */}
                      {(region.targetCountryCount ?? 0) > 0 && (
                        <span className={styles.planShare}>
                          Target markets: {region.targetAllowedCountryCount ?? 0} /{' '}
                          {region.targetCountryCount}
                        </span>
                      )}
                      <span>Allowed: {region.allowedCountryCount}</span>
                      {region.blockedCountryCount > 0 && (
                        <span>Blocked: {region.blockedCountryCount}</span>
                      )}
                      {region.licenseRequiredCountryCount > 0 && (
                        <span>License: {region.licenseRequiredCountryCount}</span>
                      )}
                      {region.geoBlockRequiredCount > 0 && (
                        <span>Geo-block: {region.geoBlockRequiredCount}</span>
                      )}
                      {/* WP-10.8: «не оценено» и «рынок не обслуживается» — разные вещи.
                          Непроверенную страну надо проверить, осознанно исключённую — нет. */}
                      {region.undecidedCountryCount > 0 && (
                        <span className={styles.notAssessed}>
                          Not assessed: {region.undecidedCountryCount}
                        </span>
                      )}
                      {region.notTargetedCountryCount - region.undecidedCountryCount > 0 && (
                        <span className={styles.mutedText}>
                          Not targeted:{' '}
                          {region.notTargetedCountryCount - region.undecidedCountryCount}
                        </span>
                      )}
                    </>
                  )}
                </div>
              </div>

              {isOpen && (
                <div className={styles.regionBody}>
                  {hasBlockingReasons && (
                    <div className={styles.blockingReasonsBox}>
                      <div className={styles.blockingReasonsTitle}>
                        <AlertTriangle size={14} />
                        Problematic Countries & Restrictions ({region.blockingReasons.length})
                      </div>
                      <div className={styles.reasonList}>
                        {region.blockingReasons.map((br) => (
                          <div key={br.countryCode} className={styles.reasonItem}>
                            <strong>{br.countryCode}</strong>: [{br.finalStatus} / {br.accessPolicy}
                            ] — {br.reasonRu}
                            {br.legalBasisRu && ` (Ground: ${br.legalBasisRu})`}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {region.countries.length === 0 ? (
                    <p className={styles.mutedText}>
                      No specific country decisions recorded in this region.
                    </p>
                  ) : (
                    <div className={styles.tableWrapper}>
                      <table className={styles.table}>
                        <thead>
                          <tr>
                            <th>Country</th>
                            <th>Status</th>
                            <th>Policy</th>
                            <th>Geo-block</th>
                            <th>Confidence</th>
                            <th>Reason</th>
                            <th>Legal Basis</th>
                          </tr>
                        </thead>
                        <tbody>
                          {region.countries.map((c) => (
                            <tr key={c.countryCode}>
                              <td>
                                <strong>{c.countryCode}</strong>
                                {/* WP-C.5: страна плана публикации отличима от страны,
                                    попавшей в отчёт вскользь. */}
                                {targetCountrySet.has(c.countryCode.toUpperCase()) && (
                                  <span className={styles.planMarker}>in plan</span>
                                )}
                              </td>
                              <td>
                                <span className={styles.badge} data-status={c.finalStatus}>
                                  {c.finalStatus}
                                </span>
                              </td>
                              <td>{c.accessPolicy}</td>
                              <td>
                                {c.geoBlockRequired ? (
                                  <span className={styles.badge} data-status="BLOCKED">
                                    <ShieldAlert size={10} /> Required
                                  </span>
                                ) : (
                                  <span className={styles.mutedText}>No</span>
                                )}
                              </td>
                              <td>{c.confidence}</td>
                              <td>{c.reasonRu || '—'}</td>
                              <td>{c.legalBasisRu || '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
