import type { FC } from 'react';
import { Select } from 'antd';
import { Input } from '@/components/common/Input';
import {
  FACT_LIST_KEYS,
  FACT_TEXT_KEYS,
  type AuthorFactsForm,
} from '@/lib/admin/author-form-state';
import { AUTHOR_PAGE_LIMITS } from '@/lib/admin/author-page-blocks';
import type { SupportedLang } from '@/lib/i18n/lang';
import styles from './AuthorForm.module.scss';

interface AuthorFactsFieldsProps {
  lang: SupportedLang;
  facts: AuthorFactsForm;
  onChange: <K extends keyof AuthorFactsForm>(field: K, value: AuthorFactsForm[K]) => void;
}

const FACT_LABELS: Record<(typeof FACT_TEXT_KEYS | typeof FACT_LIST_KEYS)[number], string> = {
  birthPlace: 'Place of birth',
  deathPlace: 'Place of death',
  nationality: 'Nationality',
  occupations: 'Occupations',
  movements: 'Literary movements',
  genres: 'Genres',
  languages: 'Languages',
  pseudonyms: 'Pseudonyms',
};

/**
 * Сводка фактов перевода полями (решение арбитра В3). Списки — теги (`Select mode="tags"`):
 * элемент добавляется по Enter целиком, запятая внутри значения его не делит.
 */
export const AuthorFactsFields: FC<AuthorFactsFieldsProps> = ({ lang, facts, onChange }) => (
  <fieldset className={styles.factsFieldset}>
    <legend className={styles.label}>Facts</legend>
    <div className={styles.row}>
      <div className={styles.field}>
        <label htmlFor={`facts-gender-${lang}`} className={styles.label}>
          Gender
        </label>
        <select
          id={`facts-gender-${lang}`}
          className={styles.select}
          value={facts.gender}
          onChange={(e) => onChange('gender', e.target.value as AuthorFactsForm['gender'])}
        >
          <option value="">Not set</option>
          <option value="male">Male</option>
          <option value="female">Female</option>
        </select>
      </div>
      {FACT_TEXT_KEYS.map((key) => (
        <div key={key} className={styles.field}>
          <label htmlFor={`facts-${key}-${lang}`} className={styles.label}>
            {FACT_LABELS[key]}
          </label>
          <Input
            id={`facts-${key}-${lang}`}
            value={facts[key]}
            maxLength={AUTHOR_PAGE_LIMITS.title}
            onChange={(e) => onChange(key, e.target.value)}
          />
        </div>
      ))}
    </div>
    <div className={styles.row}>
      {FACT_LIST_KEYS.map((key) => (
        <div key={key} className={styles.field}>
          <label htmlFor={`facts-${key}-${lang}`} className={styles.label}>
            {`${FACT_LABELS[key]} (Enter adds an item)`}
          </label>
          <Select
            id={`facts-${key}-${lang}`}
            mode="tags"
            value={facts[key]}
            onChange={(items: string[]) => onChange(key, items)}
            tokenSeparators={[]}
            open={false}
            suffixIcon={null}
          />
        </div>
      ))}
    </div>
  </fieldset>
);
