'use client';

import { useState, type FC, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useCreateRightsIntake, useUpdateRightsIntake } from '@/api/hooks/useRightsIntakes';
import type { SupportedLang } from '@/lib/i18n/lang';
import type {
  CreateRightsIntakeRequest,
  UpdateRightsIntakeRequest,
  RightsIntake,
  RightsSourceProvider,
  RightsSourceTextType,
} from '@/types/api-schema/rights-intake';
import styles from './RightsIntakeForm.module.scss';

const LANGUAGES = ['en', 'es', 'fr', 'pt', 'ru'];
const CONTENT_TYPES = ['TEXT', 'AUDIO', 'REFERRAL', 'DOWNLOAD', 'COVER', 'ILLUSTRATIONS'];
const COMPONENTS = [
  'ORIGINAL_TEXT',
  'TRANSLATION',
  'INTRODUCTION',
  'PREFACE',
  'AFTERWORD',
  'ANNOTATIONS',
  'FOOTNOTES',
  'ILLUSTRATION',
  'PHOTOGRAPH',
  'MAP',
  'COVER',
  'AUDIO_NARRATION',
  'AUDIO_RECORDING',
  'OTHER',
];

interface RightsIntakeFormProps {
  lang: SupportedLang;
  mode?: 'create' | 'edit';
  initialData?: RightsIntake;
  onCancel?: () => void;
}

export const RightsIntakeForm: FC<RightsIntakeFormProps> = ({
  lang,
  mode = 'create',
  initialData,
  onCancel,
}) => {
  const router = useRouter();
  const createMutation = useCreateRightsIntake();
  const updateMutation = useUpdateRightsIntake();

  const [form, setForm] = useState(() => {
    if (mode === 'edit' && initialData) {
      return {
        candidateTitle: initialData.candidateTitle,
        candidateAuthor: initialData.candidateAuthor,
        originalTitle: initialData.originalTitle ?? '',
        originalLanguage: initialData.originalLanguage ?? '',
        authorBirthYear: initialData.authorBirthYear?.toString() ?? '',
        authorDeathYear: initialData.authorDeathYear?.toString() ?? '',
        sourceProvider: initialData.sourceProvider as RightsSourceProvider,
        sourceExternalId: initialData.sourceExternalId ?? '',
        sourceUrl: initialData.sourceUrl ?? '',
        sourceTitle: initialData.sourceTitle ?? '',
        sourceLanguage: initialData.sourceLanguage ?? '',
        sourceTextType: initialData.sourceTextType as RightsSourceTextType,
        targetLanguages: initialData.targetLanguages as string[],
        targetCountryCodes: (initialData.targetCountryCodes as string[]).join(', '),
        plannedContentTypes: initialData.plannedContentTypes as string[],
        plannedComponents: initialData.plannedComponents ?? [],
        notesRu: initialData.notesRu ?? '',
      };
    }
    return {
      candidateTitle: '',
      candidateAuthor: '',
      originalTitle: '',
      originalLanguage: '',
      authorBirthYear: '',
      authorDeathYear: '',
      sourceProvider: 'UNKNOWN' as RightsSourceProvider,
      sourceExternalId: '',
      sourceUrl: '',
      sourceTitle: '',
      sourceLanguage: '',
      sourceTextType: 'UNKNOWN' as RightsSourceTextType,
      targetLanguages: [] as string[],
      targetCountryCodes: '',
      plannedContentTypes: [] as string[],
      plannedComponents: [] as string[],
      notesRu: '',
    };
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const updateField = (field: string, value: unknown) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const handleCheckboxGroup = (field: string, value: string, checked: boolean) => {
    const current = form[field as keyof typeof form] as string[];
    if (checked) {
      updateField(field, [...current, value]);
    } else {
      updateField(
        field,
        current.filter((v) => v !== value)
      );
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    const validationErrors: Record<string, string> = {};
    if (!form.candidateTitle.trim()) validationErrors.candidateTitle = 'Title is required';
    if (!form.candidateAuthor.trim()) validationErrors.candidateAuthor = 'Author is required';
    if (form.targetLanguages.length === 0)
      validationErrors.targetLanguages = 'Select at least one language';
    if (form.plannedContentTypes.length === 0)
      validationErrors.plannedContentTypes = 'Select at least one content type';
    if (form.sourceUrl && !/^https?:\/\/.+/.test(form.sourceUrl))
      validationErrors.sourceUrl = 'Must be a valid URL (http:// or https://)';
    if (!form.targetCountryCodes.trim())
      validationErrors.targetCountryCodes = 'Enter at least one country code';

    const countryCodes = form.targetCountryCodes
      .split(',')
      .map((c) => c.trim().toUpperCase())
      .filter(Boolean);
    const invalidCodes = countryCodes.filter((c) => !/^[A-Z]{2}$/.test(c));
    if (invalidCodes.length > 0) {
      validationErrors.targetCountryCodes = `Invalid codes: ${invalidCodes.join(', ')}`;
    }

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    const payload: CreateRightsIntakeRequest = {
      candidateTitle: form.candidateTitle.trim(),
      candidateAuthor: form.candidateAuthor.trim(),
      originalTitle: form.originalTitle || null,
      originalLanguage: form.originalLanguage || null,
      authorBirthYear: form.authorBirthYear ? parseInt(form.authorBirthYear, 10) : null,
      authorDeathYear: form.authorDeathYear ? parseInt(form.authorDeathYear, 10) : null,
      sourceProvider: form.sourceProvider,
      sourceExternalId: form.sourceExternalId || null,
      sourceUrl: form.sourceUrl || null,
      sourceTitle: form.sourceTitle || null,
      sourceLanguage: form.sourceLanguage || null,
      sourceTextType: form.sourceTextType,
      targetLanguages: form.targetLanguages,
      targetCountryCodes: countryCodes,
      plannedContentTypes: form.plannedContentTypes,
      plannedComponents: form.plannedComponents.length > 0 ? form.plannedComponents : null,
      notesRu: form.notesRu || null,
    };

    try {
      if (mode === 'edit' && initialData) {
        await updateMutation.mutateAsync({
          id: initialData.id,
          data: payload as UpdateRightsIntakeRequest,
        });
        if (onCancel) onCancel();
      } else {
        const result = await createMutation.mutateAsync(payload);
        router.push(`/admin/${lang}/rights-intakes/${result.id}`);
      }
    } catch {
      setErrors({ submit: 'Failed to save rights intake. Please try again.' });
    }
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Work</h2>
        <div className={styles.field}>
          <label className={styles.label}>Candidate Title *</label>
          <input
            className={styles.input}
            value={form.candidateTitle}
            onChange={(e) => updateField('candidateTitle', e.target.value)}
          />
          {errors.candidateTitle && <span className={styles.error}>{errors.candidateTitle}</span>}
        </div>
        <div className={styles.field}>
          <label className={styles.label}>Candidate Author *</label>
          <input
            className={styles.input}
            value={form.candidateAuthor}
            onChange={(e) => updateField('candidateAuthor', e.target.value)}
          />
          {errors.candidateAuthor && <span className={styles.error}>{errors.candidateAuthor}</span>}
        </div>
        <div className={styles.fieldRow}>
          <div className={styles.field}>
            <label className={styles.label}>Original Title</label>
            <input
              className={styles.input}
              value={form.originalTitle}
              onChange={(e) => updateField('originalTitle', e.target.value)}
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Original Language</label>
            <input
              className={styles.input}
              value={form.originalLanguage}
              onChange={(e) => updateField('originalLanguage', e.target.value)}
              placeholder="e.g. grc"
            />
          </div>
        </div>
        <div className={styles.fieldRow}>
          <div className={styles.field}>
            <label className={styles.label}>Author Birth Year</label>
            <input
              className={styles.input}
              type="number"
              value={form.authorBirthYear}
              onChange={(e) => updateField('authorBirthYear', e.target.value)}
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Author Death Year</label>
            <input
              className={styles.input}
              type="number"
              value={form.authorDeathYear}
              onChange={(e) => updateField('authorDeathYear', e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Source</h2>
        <div className={styles.fieldRow}>
          <div className={styles.field}>
            <label className={styles.label}>Source Provider</label>
            <select
              className={styles.select}
              value={form.sourceProvider}
              onChange={(e) => updateField('sourceProvider', e.target.value)}
            >
              <option value="UNKNOWN">Unknown</option>
              <option value="PROJECT_GUTENBERG">Project Gutenberg</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Source External ID</label>
            <input
              className={styles.input}
              value={form.sourceExternalId}
              onChange={(e) => updateField('sourceExternalId', e.target.value)}
              placeholder="e.g. Gutenberg eBook #"
            />
          </div>
        </div>
        <div className={styles.field}>
          <label className={styles.label}>Source URL</label>
          <input
            className={styles.input}
            value={form.sourceUrl}
            onChange={(e) => updateField('sourceUrl', e.target.value)}
          />
          {errors.sourceUrl && <span className={styles.error}>{errors.sourceUrl}</span>}
        </div>
        <div className={styles.field}>
          <label className={styles.label}>Source Title</label>
          <input
            className={styles.input}
            value={form.sourceTitle}
            onChange={(e) => updateField('sourceTitle', e.target.value)}
          />
        </div>
        <div className={styles.fieldRow}>
          <div className={styles.field}>
            <label className={styles.label}>Source Language</label>
            <input
              className={styles.input}
              value={form.sourceLanguage}
              onChange={(e) => updateField('sourceLanguage', e.target.value)}
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Source Text Type</label>
            <select
              className={styles.select}
              value={form.sourceTextType}
              onChange={(e) => updateField('sourceTextType', e.target.value)}
            >
              <option value="UNKNOWN">Unknown</option>
              <option value="ORIGINAL_TEXT">Original Text</option>
              <option value="TRANSLATION">Translation</option>
              <option value="ADAPTATION">Adaptation</option>
              <option value="ABRIDGMENT">Abridgment</option>
              <option value="COMPILATION">Compilation</option>
            </select>
          </div>
        </div>
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Publication Plan</h2>
        <div className={styles.field}>
          <label className={styles.label}>Target Languages *</label>
          <div className={styles.checkboxGroup}>
            {LANGUAGES.map((l) => (
              <label key={l} className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={form.targetLanguages.includes(l)}
                  onChange={(e) => handleCheckboxGroup('targetLanguages', l, e.target.checked)}
                />
                {l.toUpperCase()}
              </label>
            ))}
          </div>
          {errors.targetLanguages && <span className={styles.error}>{errors.targetLanguages}</span>}
        </div>
        <div className={styles.field}>
          <label className={styles.label}>Target Country Codes *</label>
          <input
            className={styles.input}
            value={form.targetCountryCodes}
            onChange={(e) => updateField('targetCountryCodes', e.target.value)}
            placeholder="US, GB, FR, DE, ..."
          />
          {errors.targetCountryCodes && (
            <span className={styles.error}>{errors.targetCountryCodes}</span>
          )}
        </div>
        <div className={styles.field}>
          <label className={styles.label}>Planned Content Types *</label>
          <div className={styles.checkboxGroup}>
            {CONTENT_TYPES.map((ct) => (
              <label key={ct} className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={form.plannedContentTypes.includes(ct)}
                  onChange={(e) => handleCheckboxGroup('plannedContentTypes', ct, e.target.checked)}
                />
                {ct.charAt(0) + ct.slice(1).toLowerCase()}
              </label>
            ))}
          </div>
          {errors.plannedContentTypes && (
            <span className={styles.error}>{errors.plannedContentTypes}</span>
          )}
        </div>
        <div className={styles.field}>
          <label className={styles.label}>Planned Components</label>
          <div className={styles.checkboxGroup}>
            {COMPONENTS.map((comp) => (
              <label key={comp} className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={form.plannedComponents.includes(comp)}
                  onChange={(e) => handleCheckboxGroup('plannedComponents', comp, e.target.checked)}
                />
                {comp
                  .split('_')
                  .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
                  .join(' ')}
              </label>
            ))}
          </div>
        </div>
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Notes</h2>
        <div className={styles.field}>
          <label className={styles.label}>Notes (Russian)</label>
          <textarea
            className={styles.textarea}
            value={form.notesRu}
            onChange={(e) => updateField('notesRu', e.target.value)}
          />
        </div>
      </div>

      {errors.submit && <div className={styles.submitError}>{errors.submit}</div>}

      <div className={styles.actions}>
        <button
          type="button"
          className={styles.cancelBtn}
          onClick={() => (onCancel ? onCancel() : router.back())}
        >
          Cancel
        </button>
        <button
          type="submit"
          className={styles.submitBtn}
          disabled={createMutation.isPending || updateMutation.isPending}
        >
          {createMutation.isPending || updateMutation.isPending
            ? 'Saving...'
            : mode === 'edit'
              ? 'Save Changes'
              : 'Create Rights Intake'}
        </button>
      </div>
    </form>
  );
};
