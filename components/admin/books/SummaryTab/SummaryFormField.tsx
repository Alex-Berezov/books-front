import type { FC } from 'react';
import { RichTextEditor } from '@/components/common/RichTextEditor';
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

// Approximate editor min-height from the original `rows` count (~24px per line).
const rowsToMinHeight = (rows: number): string => `${Math.max(rows, 3) * 24}px`;

export const SummaryFormField: FC<SummaryFormFieldProps> = (props) => {
  const { id, label, hint, placeholder, rows, value, onChange } = props;

  const handleChange = (html: string) => {
    onChange(id, html);
  };

  return (
    <div className={styles.formGroup}>
      <label className={styles.label} htmlFor={id}>
        {label}
        <span className={styles.labelHint}>({hint})</span>
      </label>
      <RichTextEditor
        id={id}
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        minHeight={rowsToMinHeight(rows)}
        ariaLabel={label}
      />
    </div>
  );
};
