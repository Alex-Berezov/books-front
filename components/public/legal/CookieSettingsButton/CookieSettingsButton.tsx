'use client';

import { useConsent } from '@/lib/consent/ConsentProvider';
import type { CookieSettingsButtonProps } from './CookieSettingsButton.types';

/**
 * «Настройки cookie» в подвале (`product.md` §2, §7.3): снова открывает плашку. Видна в регионе
 * плашки и тому, у кого уже сохранён выбор; при GPC и остальным посетителям её нет.
 */
export function CookieSettingsButton({ label, className, wrapper }: CookieSettingsButtonProps) {
  const { settingsAvailable, openConsentBanner } = useConsent();

  if (!settingsAvailable) return null;

  const button = (
    <button type="button" className={className} onClick={openConsentBanner}>
      {label}
    </button>
  );

  return wrapper === 'li' ? <li>{button}</li> : button;
}
