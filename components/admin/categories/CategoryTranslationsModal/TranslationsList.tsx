import { Edit, Trash2 } from 'lucide-react';
import { Button } from '@/components/common/Button';
import { LANGUAGE_FLAGS, LANGUAGE_LABELS, type SupportedLang } from '@/lib/i18n/lang';
import type { CategoryTranslation } from '@/types/api-schema';
import styles from './CategoryTranslationsModal.module.scss';

interface TranslationsListProps {
  translations: CategoryTranslation[];
  isLoading: boolean;
  onEdit: (translation: CategoryTranslation) => void;
  onDelete: (language: string) => void;
}

export const TranslationsList = ({
  translations,
  isLoading,
  onEdit,
  onDelete,
}: TranslationsListProps) => {
  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (translations.length === 0) {
    return <div className={styles.emptyState}>No translations yet</div>;
  }

  return (
    <div className={styles.translationsList}>
      {translations.map((translation) => (
        <div key={translation.language} className={styles.translationItem}>
          <div className={styles.translationInfo}>
            <div className={styles.languageBadge}>
              {LANGUAGE_FLAGS[translation.language as SupportedLang]}{' '}
              {LANGUAGE_LABELS[translation.language as SupportedLang]}
            </div>
            <span className={styles.translationName}>{translation.name}</span>
            <span className={styles.translationSlug}>{translation.slug}</span>
          </div>
          <div className={styles.actions}>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit(translation)}
              aria-label="Edit translation"
            >
              <Edit size={16} />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(translation.language)}
              aria-label="Delete translation"
              className={styles.deleteButton}
            >
              <Trash2 size={16} />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
};
