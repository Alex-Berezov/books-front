'use client';

import { ChevronLeft } from 'lucide-react';
import styles from './SmartBackButton.module.scss';
import { useSmartBack } from './useSmartBack';

export interface SmartBackButtonProps {
  label: string;
  fallbackHref: string;
  className?: string;
}

export function SmartBackButton({ label, fallbackHref, className }: SmartBackButtonProps) {
  const goBack = useSmartBack(fallbackHref);

  return (
    <button type="button" onClick={goBack} className={`${styles.resetBtn} ${className ?? ''}`}>
      <ChevronLeft size={16} aria-hidden="true" /> {label}
    </button>
  );
}
