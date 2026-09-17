import type { FC } from 'react';
import { ShieldAlert, ShieldCheck } from 'lucide-react';
import type { RightsClaimSummary } from '@/types/api-schema/rights-claims';
import styles from './RightsClaimsSummary.module.scss';

type BannerStatus = 'ERROR' | 'LOADING' | 'BLOCK' | 'PARTIAL' | 'WARN' | 'OK';

const BANNER_TEXT: Record<BannerStatus, string> = {
  ERROR: 'Не удалось загрузить претензии: статус неизвестен',
  LOADING: 'Загрузка претензий…',
  BLOCK: 'Публикация заблокирована претензией правообладателя',
  PARTIAL: 'Список неполный: блокирующие претензии могли не попасть на страницу',
  WARN: 'Есть открытые претензии',
  OK: 'Активных претензий нет',
};

interface BannerInput {
  hasData: boolean;
  isError: boolean;
  hasBlocking: boolean;
  isTruncated: boolean;
  hasOpen: boolean;
}

// Уверенный вывод только из полного ответа; по обрезанному списку доказуема лишь блокировка.
const resolveBannerStatus = (input: BannerInput): BannerStatus => {
  if (!input.hasData) return input.isError ? 'ERROR' : 'LOADING';
  if (input.hasBlocking) return 'BLOCK';
  if (input.isTruncated) return 'PARTIAL';
  return input.hasOpen ? 'WARN' : 'OK';
};

export interface RightsClaimsSummaryProps {
  claims: RightsClaimSummary[];
  /** Число претензий на сервере; `null` - ответа нет. */
  total: number | null;
  isError: boolean;
}

export const RightsClaimsSummary: FC<RightsClaimsSummaryProps> = ({ claims, total, isError }) => {
  const hasData = total !== null;
  const isTruncated = hasData && total > claims.length;
  const openClaims = claims.filter((claim) => claim.isOpen);
  const blockingClaims = openClaims.filter((claim) => claim.blocksPublication);
  const overdueClaims = openClaims.filter((claim) => claim.isOverdue);
  const activeBlocksCount = claims.reduce((sum, claim) => sum + claim.activeBlocksCount, 0);
  const blockedCountries = new Set(claims.flatMap((claim) => claim.blockedCountryCodes));

  const bannerStatus = resolveBannerStatus({
    hasData,
    isError,
    hasBlocking: blockingClaims.length > 0,
    isTruncated,
    hasOpen: openClaims.length > 0,
  });
  const pageNote = isTruncated ? ' (среди показанных)' : '';
  const show = (value: number): string => (hasData ? String(value) : '—');

  return (
    <>
      <div className={styles.metrics} aria-label="Метрики претензий">
        <span>Всего: {hasData ? total : '—'}</span>
        <span>
          Открытых{pageNote}: {show(openClaims.length)}
        </span>
        <span>
          Блокирующих публикацию{pageNote}: {show(blockingClaims.length)}
        </span>
        <span>
          Просроченных{pageNote}: {show(overdueClaims.length)}
        </span>
        <span>
          Активных блокировок{pageNote}: {show(activeBlocksCount)}
        </span>
        <span>
          Заблокировано стран{pageNote}: {show(blockedCountries.size)}
        </span>
      </div>

      {isTruncated && (
        <p className={styles.notice} data-testid="claims-truncated" role="alert">
          Показаны первые {claims.length} из {total} претензий: остальные и метрики по ним сюда не
          попали.
        </p>
      )}

      {hasData && isError && (
        <p className={styles.notice} data-testid="claims-refresh-failed" role="alert">
          Не удалось обновить список: показаны прежние данные.
        </p>
      )}

      <div className={styles.banner} data-status={bannerStatus} role="status">
        {bannerStatus === 'OK' ? (
          <ShieldCheck aria-hidden="true" size={14} />
        ) : (
          <ShieldAlert aria-hidden="true" size={14} />
        )}
        <strong>{BANNER_TEXT[bannerStatus]}</strong>
      </div>
    </>
  );
};
