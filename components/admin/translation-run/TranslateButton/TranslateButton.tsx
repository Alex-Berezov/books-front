'use client';

import { useState, type FC } from 'react';
import { Languages } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useTranslationSource } from '@/api/hooks';
import { Button } from '@/components/admin/common/Button';
import { blockText, mismatchText } from '../translationRun.utils';
import styles from './TranslateButton.module.scss';

// Окно со своими списками и оценкой грузится по клику: страница версии и так тяжёлая.
const StartRunModal = dynamic(() => import('../StartRunModal').then((m) => m.StartRunModal), {
  ssr: false,
});

export interface TranslateButtonProps {
  versionId: string;
  bookId: string;
}

/**
 * «Translate to other languages» в шапке версии (F05-7, `product.md` §2.1) — страница рисует
 * её только `admin`. Неактивна с подсказкой по причине `translation-source`; расхождение поля
 * «язык оригинала» видно рядом.
 */
export const TranslateButton: FC<TranslateButtonProps> = ({ versionId, bookId }) => {
  const source = useTranslationSource(versionId, true);
  const [isOpen, setIsOpen] = useState(false);

  const data = source.data;
  const hint = data
    ? data.canTranslate
      ? null
      : blockText(data)
    : source.isError
      ? 'Translation availability could not be loaded.'
      : null;
  const mismatch = data ? mismatchText(data) : null;

  return (
    <span className={styles.wrapper}>
      <Button
        variant="secondary"
        leftIcon={<Languages size={16} />}
        disabled={!data?.canTranslate}
        loading={source.isLoading}
        title={hint ?? undefined}
        onClick={() => setIsOpen(true)}
      >
        Translate to other languages
      </Button>
      {hint && <span className={styles.hint}>{hint}</span>}
      {mismatch && <span className={styles.hint}>{mismatch}</span>}
      {isOpen && data && (
        <StartRunModal
          isOpen
          onCancel={() => setIsOpen(false)}
          onStarted={() => setIsOpen(false)}
          versionId={versionId}
          bookId={bookId}
          source={data}
        />
      )}
    </span>
  );
};
