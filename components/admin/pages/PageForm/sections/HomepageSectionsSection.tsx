'use client';

import type { FC } from 'react';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import type { PageFormData } from '../PageForm.types';
import type {
  Control,
  FieldErrors,
  UseFormRegister,
  UseFormSetValue,
  UseFormWatch,
} from 'react-hook-form';
import styles from '../PageForm.module.scss';

export interface HomepageSectionsSectionProps {
  register: UseFormRegister<PageFormData>;
  control: Control<PageFormData>;
  errors: FieldErrors<PageFormData>;
  watch: UseFormWatch<PageFormData>;
  setValue: UseFormSetValue<PageFormData>;
  isSubmitting: boolean;
}

export const HomepageSectionsSection: FC<HomepageSectionsSectionProps> = ({
  watch,
  setValue,
  isSubmitting,
}) => {
  const pageType = watch('type');

  if (pageType !== 'homepage') {
    return null;
  }

  const sections = watch('sections') || {};

  const updateSections = (patch: Record<string, unknown>) => {
    setValue('sections', { ...sections, ...patch }, { shouldValidate: false });
  };

  const whyBibliaris =
    (sections.whyBibliaris as Array<{ icon: string; title: string; text: string }>) || [];
  const tagSlugs = (sections.tagSlugs as string[]) || [];
  const collectionSlugs = (sections.collectionSlugs as string[]) || [];
  const genreSlugs = (sections.genreSlugs as string[]) || [];
  const categorySlugs = (sections.categorySlugs as string[]) || [];
  const aboutText = (sections.aboutText as string) || '';

  return (
    <>
      {/* Why Bibliaris */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Why Bibliaris</h2>
        <p className={styles.hint}>Feature cards shown below the main sections.</p>
        {whyBibliaris.map((item, idx) => (
          <div key={idx} className={styles.faqBlock}>
            <div className={styles.faqInputs}>
              <Input
                value={item.title}
                onChange={(e) => {
                  const list = [...whyBibliaris];
                  list[idx] = { ...list[idx], title: e.target.value };
                  updateSections({ whyBibliaris: list });
                }}
                placeholder="Title (e.g. Read online)"
                fullWidth
              />
              <Input
                value={item.text}
                onChange={(e) => {
                  const list = [...whyBibliaris];
                  list[idx] = { ...list[idx], text: e.target.value };
                  updateSections({ whyBibliaris: list });
                }}
                placeholder="Description text"
                fullWidth
              />
            </div>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                const list = whyBibliaris.filter((_, i) => i !== idx);
                updateSections({ whyBibliaris: list });
              }}
            >
              Remove
            </Button>
          </div>
        ))}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            updateSections({
              whyBibliaris: [...whyBibliaris, { icon: 'book', title: '', text: '' }],
            });
          }}
        >
          + Add Feature
        </Button>
      </div>

      {/* About Text */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>About Bibliaris (SEO Text)</h2>
        <p className={styles.hint}>
          Long-form SEO text shown at the bottom of the homepage (200-350 words).
        </p>
        <div className={styles.field}>
          <textarea
            className={styles.textarea}
            disabled={isSubmitting}
            value={aboutText}
            onChange={(e) => updateSections({ aboutText: e.target.value })}
            placeholder="Bibliaris is a multilingual digital library..."
            rows={8}
          />
        </div>
      </div>

      {/* Category Slugs */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Browse by Category</h2>
        <p className={styles.hint}>
          Comma-separated category slugs to feature (e.g. classic-literature, fiction, history)
        </p>
        <Input
          value={categorySlugs.join(', ')}
          onChange={(e) =>
            updateSections({
              categorySlugs: e.target.value
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean),
            })
          }
          placeholder="classic-literature, fiction, history, philosophy"
          fullWidth
          disabled={isSubmitting}
        />
      </div>

      {/* Genre Slugs */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Explore by Genre</h2>
        <p className={styles.hint}>
          Comma-separated genre slugs to feature (e.g. gothic-fiction, romance, mystery)
        </p>
        <Input
          value={genreSlugs.join(', ')}
          onChange={(e) =>
            updateSections({
              genreSlugs: e.target.value
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean),
            })
          }
          placeholder="gothic-fiction, romance, drama, mystery"
          fullWidth
          disabled={isSubmitting}
        />
      </div>

      {/* Collection Slugs */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Curated Collections</h2>
        <p className={styles.hint}>
          Comma-separated collection slugs to feature (e.g. short-reads, free-books, audiobooks)
        </p>
        <Input
          value={collectionSlugs.join(', ')}
          onChange={(e) =>
            updateSections({
              collectionSlugs: e.target.value
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean),
            })
          }
          placeholder="short-reads, free-books, school-reading"
          fullWidth
          disabled={isSubmitting}
        />
      </div>

      {/* Tag Slugs (Themes) */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Explore Book Themes (Tags)</h2>
        <p className={styles.hint}>
          Comma-separated tag slugs to feature (e.g. love, identity, freedom)
        </p>
        <Input
          value={tagSlugs.join(', ')}
          onChange={(e) =>
            updateSections({
              tagSlugs: e.target.value
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean),
            })
          }
          placeholder="love, moral-choice, identity, freedom"
          fullWidth
          disabled={isSubmitting}
        />
      </div>
    </>
  );
};
