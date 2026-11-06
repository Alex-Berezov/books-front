'use client';

import { useState, type FC } from 'react';
import { Button } from '@/components/admin/common/Button';
import styles from './ContentDraft.module.scss';
import { REGEN_REMARK_MAX } from './contentDraft.utils';

export interface ItemRegenerateProps {
  /** Поле `id` для подписи замечания. */
  id: string;
  disabled: boolean;
  busy: boolean;
  /** Перегенерация с замечанием автору (`undefined` — без замечания); `true` — ушла. */
  onRegenerate: (remark: string | undefined) => Promise<boolean>;
  /** Куда придёт результат: правило своего хода (пересказа или анализа). */
  hint: string;
}

/**
 * «Regenerate» текста или блока хода (F06 `product.md` §5, F07 §5): необязательное замечание
 * редактора уходит автору; «Cancel» закрывает форму и стирает набранное замечание.
 */
export const ItemRegenerate: FC<ItemRegenerateProps> = ({
  id,
  disabled,
  busy,
  onRegenerate,
  hint,
}) => {
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
    // Подсказка — у самой кнопки, до раскрытия формы (F07-3, шаг 7): куда придёт результат.
    return (
      <span className={styles.actions}>
        <Button variant="secondary" onClick={() => setOpen(true)} disabled={disabled}>
          Regenerate
        </Button>
        <span className={styles.hint}>{hint}</span>
      </span>
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
      <p className={styles.hint}>{hint}</p>
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
