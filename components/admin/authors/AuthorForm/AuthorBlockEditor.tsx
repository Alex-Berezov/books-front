import type { FC } from 'react';
import { formatAuthorDataIssue } from '@/lib/admin/author-page-blocks';
import type { AuthorBlockDraft } from '@/lib/admin/author-form-state';
import styles from './AuthorForm.module.scss';

interface AuthorBlockEditorProps {
  id: string;
  label: string;
  draft: AuthorBlockDraft;
  onChange: (text: string) => void;
}

/**
 * JSON-редактор одного блока страницы автора (решение арбитра В3). Проверка — та же схема,
 * что у импорта; пока в тексте ошибка, значение блока в форме прежнее и сохранение стоит.
 */
export const AuthorBlockEditor: FC<AuthorBlockEditorProps> = ({ id, label, draft, onChange }) => {
  const hasIssues = !!draft.issues && draft.issues.length > 0;
  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.label}>
        {label}
      </label>
      <textarea
        id={id}
        className={`${styles.textarea} ${styles.jsonTextarea} ${hasIssues ? styles.textareaError : ''}`}
        rows={Math.min(14, Math.max(3, draft.text.split('\n').length))}
        value={draft.text}
        onChange={(e) => onChange(e.target.value)}
        spellCheck={false}
        aria-invalid={hasIssues}
        aria-describedby={hasIssues ? `${id}-issues` : undefined}
      />
      {draft.checking && (
        <p className={styles.hint} role="status">
          Checking…
        </p>
      )}
      {hasIssues && (
        <ul id={`${id}-issues`} className={styles.issueList} role="alert">
          {draft.issues!.map((issue, idx) => (
            <li key={idx}>{formatAuthorDataIssue(issue)}</li>
          ))}
        </ul>
      )}
    </div>
  );
};
