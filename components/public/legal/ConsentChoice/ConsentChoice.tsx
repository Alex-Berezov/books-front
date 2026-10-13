'use client';

import { Button } from '@/components/common/Button';
import { useConsent } from '@/lib/consent/ConsentProvider';
import { useTranslation } from '@/lib/i18n/useTranslation';
import styles from './ConsentChoice.module.scss';

/**
 * Блок «Ваш выбор» на `/cookies` (`product.md` §7.3-7.5). Работает в любой стране: показывает,
 * грузится ли аналитика, и переключает её. Включение - то же, что «Принять» на плашке, выключение -
 * «Отклонить». Пока провайдер не принял решение, статуса нет и переключатель недоступен: иначе
 * блок сначала показал бы «выключена», а клик в этот миг спорил бы с ответом о регионе.
 * При GPC переключатель недоступен: отказ уже передан браузером.
 */
export function ConsentChoice() {
  const { gpc, ready, analyticsAllowed, decide } = useConsent();
  const { t } = useTranslation();

  if (gpc) {
    return (
      <div className={styles.choice} data-testid="consent-choice">
        <p className={styles.status}>{t('consent.gpcActive')}</p>
        <Button variant="secondary" disabled>
          {t('consent.turnOn')}
        </Button>
      </div>
    );
  }

  return (
    <div className={styles.choice} data-testid="consent-choice">
      <p className={styles.status} aria-live="polite">
        {ready && (analyticsAllowed ? t('consent.choiceOn') : t('consent.choiceOff'))}
      </p>
      <Button variant="secondary" disabled={!ready} onClick={() => decide(!analyticsAllowed)}>
        {analyticsAllowed ? t('consent.turnOff') : t('consent.turnOn')}
      </Button>
    </div>
  );
}
