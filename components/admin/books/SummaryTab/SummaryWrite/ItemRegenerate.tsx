'use client';

import { useState, type FC } from 'react';
import { Button } from '@/components/admin/common/Button';
import styles from './SummaryWrite.module.scss';
import { REGEN_REMARK_MAX } from './summaryWrite.utils';

export interface ItemRegenerateProps {
  /** Поле `id` для подписи замечания. */
  id: string;
  disabled: boolean;
  busy: boolean;
  /** Перегенерация с замечанием автору (`undefined` — без замечания); `true` — ушла. */
  onRegenerate: (remark: string | undefined) => Promise<boolean>;
}

/**
 * «Regenerate» текста хода (F06 `product.md` §5): необязательное замечание редактора уходит
 * автору; «Cancel» закрывает форму и стирает набранное замечание.
 */
export const ItemRegenerate: FC<ItemRegenerateProps> = ({ id, disabled, busy, onRegenerate }) => {
  const [open, setOpen] = useState(false);
  const [remark, setRemark] = useState('');

  const close = () => {
    setOpen(false);
    setRemark('');
  };
  const start = async () => {
    const text = remark.trim();
    if (await onRegenerate(text || undefined)) close();
  };

  if (!open) {
    return (
      <Button variant="secondary" onClick={() => setOpen(true)} disabled={disabled}>
        Regenerate
      </Button>
    );
  }
  return (
    <div className={styles.block}>
      <label className={styles.label} htmlFor={`${id}-remark`}>
        Remark for the author (optional)
      </label>
      <textarea
        id={`${id}-remark`}
        className={styles.remarkInput}
        rows={3}
        maxLength={REGEN_REMARK_MAX}
        value={remark}
        onChange={(e) => setRemark(e.target.value)}
      />
      <p className={styles.hint}>
        The result comes as a proposal unless the field is empty on an unpublished version.
      </p>
      <div className={styles.actions}>
        <Button variant="secondary" onClick={() => void start()} loading={busy} disabled={disabled}>
          Start regeneration
        </Button>
        <Button variant="ghost" onClick={close} disabled={busy}>
          Cancel
        </Button>
      </div>
    </div>
  );
};
