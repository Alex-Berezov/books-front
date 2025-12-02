import type { FC } from 'react';
import type { SummaryFormData } from './SummaryTab.types';
import styles from './SummaryTab.module.scss';

interface SummaryFormFieldProps {
  id: keyof SummaryFormData;
  label: string;
  hint: string;
  placeholder: string;
  rows: number;
  value: string;
  onChange: (field: keyof SummaryFormData, value: string) => void;
}

export const SummaryFormField: FC<SummaryFormFieldProps> = (props) => {
  const { id, label, hint, placeholder, rows, value, onChange } = props;

  return (
    <div className={styles.formGroup}>
      <label className={styles.label} htmlFor={id}>
        {label}
        <span className={styles.labelHint}>({hint})</span>
      </label>
      <textarea
        className={styles.textarea}
        id={id}
        onChange={(e) => onChange(id, e.target.value)}
        placeholder={placeholder}
        rows={rows}
        value={value}
      />
    </div>
  );
};
