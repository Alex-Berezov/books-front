'use client';

import Link from 'next/link';
import { Button } from '@/components/common/Button';
import { useConsent } from '@/lib/consent/ConsentProvider';
import { useTranslation } from '@/lib/i18n/useTranslation';
import styles from './ConsentBanner.module.scss';

/**
 * Плашка согласия на аналитику (`F01`, `product.md` §7.2-7.3). Рендерит её `ConsentProvider`, когда
 * она нужна. Две кнопки одного вида - выбор равноценный; крестика нет. Открыта кнопкой
 * «Настройки cookie» - показывает текущий выбор строкой, кнопки остаются равными. Фокус не
 * забирает, прокрутку и клики по странице не блокирует.
 */
export function ConsentBanner() {
  const { choice, decide } = useConsent();
  const { t, lang } = useTranslation();

  return (
    <div role="region" aria-label={t('consent.ariaLabel')} className={styles.banner}>
      <div className={styles.inner}>
        <div className={styles.text}>
          <p className={styles.paragraph}>
            {t('consent.text')}{' '}
            <Link href={`/${lang}/cookies`} className={styles.link}>
              {t('consent.policyLink')}
            </Link>
          </p>
          {choice && (
            <p className={styles.current} data-testid="consent-current">
              {choice.analytics ? t('consent.choiceOn') : t('consent.choiceOff')}
            </p>
          )}
        </div>
        <div className={styles.actions}>
          <Button variant="primary" fullWidth onClick={() => decide(true)}>
            {t('consent.accept')}
          </Button>
          <Button variant="primary" fullWidth onClick={() => decide(false)}>
            {t('consent.reject')}
          </Button>
        </div>
      </div>
    </div>
  );
}
