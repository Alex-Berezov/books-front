'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type FC, type ReactNode } from 'react';
import { ClipboardCopy, Download } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useSnackbar } from 'notistack';
import { useAuthorPromptInputs, useCreateAuthor, useUpdateAuthor } from '@/api/hooks/useAuthors';
import { AdminRichTextEditor } from '@/components/admin/common/AdminRichTextEditor';
import { Button } from '@/components/admin/common/Button';
import { MediaPicker } from '@/components/admin/common/MediaPicker/MediaPicker';
import { SlugInput } from '@/components/admin/common/SlugInput';
import { Input } from '@/components/common/Input';
import {
  applyPhotoChange,
  emptyAuthorForm,
  photoCreditToForm,
  translationToForm,
  type AuthorFactsForm,
  type AuthorGeneralForm,
  type AuthorPhotoCreditForm,
  type AuthorTranslationForm,
} from '@/lib/admin/author-form-state';
import { mergeAuthorImport } from '@/lib/admin/author-import';
import {
  AUTHOR_BLOCK_KEYS,
  AUTHOR_PAGE_LIMITS,
  formatAuthorDataIssue,
  type AuthorBlockKey,
} from '@/lib/admin/author-page-blocks';
import { buildPromptInputsText } from '@/lib/admin/author-prompt-inputs';
import { buildAuthorRequest } from '@/lib/admin/author-request';
import { copyDeferredText } from '@/lib/admin/copy-deferred-text';
import { loadAuthorValidation, type AuthorValidation } from '@/lib/admin/load-author-validation';
import { FAQ_ANSWER_MAX_LENGTH, FAQ_QUESTION_MAX_LENGTH } from '@/lib/constants/faq';
import { FLAG_COMPONENTS } from '@/lib/i18n/FlagIcon';
import { SUPPORTED_LANGS, type SupportedLang } from '@/lib/i18n/lang';
import { ApiError } from '@/types/api';
import type { AuthorImportData } from '@/lib/admin/author-page-blocks.schema';
import type { Author, AuthorSlugWarning, SeoData } from '@/types/api-schema';
import { AuthorBlockEditor } from './AuthorBlockEditor';
import { AuthorFactsFields } from './AuthorFactsFields';
import styles from './AuthorForm.module.scss';
import { ImportAuthorModal } from './ImportAuthorModal';

/** Поля подписи портрета в порядке вывода (решение арбитра В3: рядом с `MediaPicker`). */
const PHOTO_CREDIT_FIELDS = [
  ['author', 'Photo author'],
  ['license', 'License'],
  ['licenseUrl', 'License URL'],
  ['sourceUrl', 'Source URL'],
] as const satisfies ReadonlyArray<readonly [keyof AuthorPhotoCreditForm, string]>;

/** Подписи JSON-редакторов блоков страницы автора. */
const BLOCK_LABELS: Record<AuthorBlockKey, string> = {
  notableWorks: 'Notable works',
  startHere: 'Start here',
  timeline: 'Timeline',
  influences: 'Influences',
  awards: 'Awards',
  adaptations: 'Adaptations',
  funFacts: 'Fun facts',
  sources: 'Sources',
  quotes: 'Quotes',
};

/** Предупреждения о ненайденных слагах висят дольше обычного: их надо успеть прочитать. */
const SLUG_WARNINGS_DURATION_MS = 20_000;

interface AuthorFormProps {
  author?: Author | null;
  lang: string;
}

export const AuthorForm: FC<AuthorFormProps> = (props) => {
  const { author, lang } = props;
  const router = useRouter();
  const { enqueueSnackbar } = useSnackbar();
  const isEditMode = !!author;

  const createMutation = useCreateAuthor();
  const updateMutation = useUpdateAuthor();
  const promptInputsQuery = useAuthorPromptInputs(author?.id ?? '');

  // Active tab state: 'general' | SupportedLang
  const [activeTab, setActiveTab] = useState<string>('general');
  // Collapsible SEO panels per language
  const [seoExpanded, setSeoExpanded] = useState<Record<SupportedLang, boolean>>({
    en: false,
    es: false,
    fr: false,
    pt: false,
    ru: false,
  });

  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  // Кнопка «Вводных» занята, пока идут запрос и запись в буфер.
  const [isCopyingPrompt, setIsCopyingPrompt] = useState(false);
  // Общие поля автора (даты, имя на родном языке, подпись портрета) — одни на все языки.
  const [general, setGeneral] = useState<AuthorGeneralForm>(() => emptyAuthorForm().general);
  // Translations states containing all localized fields
  const [translations, setTranslations] = useState<Record<SupportedLang, AuthorTranslationForm>>(
    () => emptyAuthorForm().translations
  );

  // Проверки на `zod` грузятся лениво (бюджет бандла роутов авторов, решение арбитра F02-2):
  // при открытии окна импорта, первой правке JSON-редактора и сохранении.
  const [validation, setValidation] = useState<AuthorValidation | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  const ensureValidation = useCallback(async () => {
    const loaded = await loadAuthorValidation();
    setValidation(() => loaded);
    return loaded;
  }, []);

  // Один тост на один сбой: правки, ждавшие ту же загрузку, получают один и тот же отказ.
  const reportedLoadFailure = useRef<unknown>(null);
  const reportValidationLoadFailure = useCallback(
    (error: unknown) => {
      if (reportedLoadFailure.current === error) return;
      reportedLoadFailure.current = error;
      enqueueSnackbar('Could not load data validation, try again', { variant: 'error' });
    },
    [enqueueSnackbar]
  );

  // Окно импорта: сбой загрузки — текст ошибки и повтор, а не вечная «загрузка».
  const [importLoadFailed, setImportLoadFailed] = useState(false);
  const loadForImport = useCallback(() => {
    setImportLoadFailed(false);
    ensureValidation().catch(() => setImportLoadFailed(true));
  }, [ensureValidation]);

  useEffect(() => {
    if (isImportModalOpen) loadForImport();
  }, [isImportModalOpen, loadForImport]);

  // Load initial data
  useEffect(() => {
    if (author) {
      const initial = emptyAuthorForm();
      setGeneral({
        birthDate: author.birthDate || '',
        deathDate: author.deathDate || '',
        nativeName: author.nativeName || '',
        photoCredit: photoCreditToForm(author.photoCredit),
      });

      const mappedTrans = initial.translations;
      if (author.translations) {
        author.translations.forEach((t) => {
          const l = t.language as SupportedLang;
          if (mappedTrans[l]) {
            mappedTrans[l] = translationToForm(t);
          }
        });
      }
      setTranslations(mappedTrans);
    }
  }, [author]);

  // Портрет один на все языки; в og не копируется (решение арбитра В6).
  const handlePhotoChange = (newPhotoUrl: string | null) => {
    setTranslations((prev) => applyPhotoChange(prev, newPhotoUrl));
  };

  const handleGeneralChange = (field: 'birthDate' | 'deathDate' | 'nativeName', value: string) => {
    setGeneral((prev) => ({ ...prev, [field]: value }));
  };

  const handlePhotoCreditChange = (field: keyof AuthorPhotoCreditForm, value: string) => {
    setGeneral((prev) => ({ ...prev, photoCredit: { ...prev.photoCredit, [field]: value } }));
  };

  // Translation helpers
  const handleTranslationChange = (langKey: SupportedLang, field: string, value: unknown) => {
    setTranslations((prev) => {
      const updatedTranslation = {
        ...prev[langKey],
        [field]: value,
      };

      if (field === 'slug') {
        const slugVal = (value as string) || '';
        updatedTranslation.seo = {
          ...updatedTranslation.seo,
          canonicalUrl: slugVal ? `https://bibliaris.com/${langKey}/author/${slugVal}` : '',
        };
      }

      return {
        ...prev,
        [langKey]: updatedTranslation,
      };
    });
  };

  const handleFactsChange = <K extends keyof AuthorFactsForm>(
    langKey: SupportedLang,
    field: K,
    value: AuthorFactsForm[K]
  ) => {
    setTranslations((prev) => ({
      ...prev,
      [langKey]: { ...prev[langKey], facts: { ...prev[langKey].facts, [field]: value } },
    }));
  };

  // Проверка текста редактора по последнему тексту в состоянии: пока модуль грузился,
  // владелец мог напечатать ещё. Ошибка не затирает прежнее значение блока (решение арбитра В3).
  const checkDraft = (
    prev: Record<SupportedLang, AuthorTranslationForm>,
    langKey: SupportedLang,
    key: AuthorBlockKey,
    checker: AuthorValidation
  ): Record<SupportedLang, AuthorTranslationForm> => {
    const current = prev[langKey];
    const { text } = current.drafts[key];
    const result = checker.applyBlockText(key, text, langKey);
    return {
      ...prev,
      [langKey]: {
        ...current,
        drafts: { ...current.drafts, [key]: { text, issues: result.issues } },
        blocks: 'value' in result ? { ...current.blocks, [key]: result.value } : current.blocks,
      },
    };
  };

  const handleBlockChange = (langKey: SupportedLang, key: AuthorBlockKey, text: string) => {
    setTranslations((prev) => {
      const current = prev[langKey];
      const next = {
        ...prev,
        [langKey]: {
          ...current,
          drafts: {
            ...current.drafts,
            [key]: { text, issues: current.drafts[key].issues, checking: !validation },
          },
        },
      };
      return validation ? checkDraft(next, langKey, key, validation) : next;
    });
    if (validation) return;
    ensureValidation()
      .then((loaded) =>
        setTranslations((prev) =>
          prev[langKey].drafts[key].checking ? checkDraft(prev, langKey, key, loaded) : prev
        )
      )
      .catch((error: unknown) => {
        // Текст остаётся непроверенным: его заново проверит сохранение (и не отправит, пока
        // модуль не загрузится), а «Checking…» не висит вечно.
        setTranslations((prev) => {
          const current = prev[langKey];
          return {
            ...prev,
            [langKey]: {
              ...current,
              drafts: { ...current.drafts, [key]: { ...current.drafts[key], checking: false } },
            },
          };
        });
        reportValidationLoadFailure(error);
      });
  };

  const handleSeoChange = (langKey: SupportedLang, field: keyof SeoData, value: string) => {
    setTranslations((prev) => {
      const updatedSeo = {
        ...prev[langKey].seo,
        [field]: value,
      };

      if (field === 'metaTitle') {
        updatedSeo.ogTitle = value;
      } else if (field === 'metaDescription') {
        updatedSeo.ogDescription = value;
      }

      return {
        ...prev,
        [langKey]: {
          ...prev[langKey],
          seo: updatedSeo,
        },
      };
    });
  };

  const analyzeImport = useMemo(
    () =>
      validation
        ? (jsonText: string) => validation.analyzeAuthorImport({ general, translations }, jsonText)
        : null,
    [validation, general, translations]
  );

  // Слияние по T5: ключа нет — поле не трогается, `null`/`[]` — очищается.
  const handleImport = (data: AuthorImportData) => {
    const merged = mergeAuthorImport({ general, translations }, data);
    setGeneral(merged.general);
    setTranslations(merged.translations);
    enqueueSnackbar('Data imported', { variant: 'success' });
  };

  // Без `async`/`await` до записи: запись в буфер должна начаться в самом обработчике клика,
  // иначе Safari теряет жест пользователя (`copyDeferredText`).
  const handleCopyPromptInputs = () => {
    setIsCopyingPrompt(true);
    let truncated = false;
    let loadFailed = false;
    let serverFailed = false;
    const text = promptInputsQuery.refetch().then((result) => {
      if (result.isError || !result.data) {
        loadFailed = true;
        // 5xx показывает общий тост клиента; свой — только на 4xx и сбой сети.
        serverFailed = result.error instanceof ApiError && result.error.statusCode >= 500;
        throw new Error('Could not load prompt inputs');
      }
      truncated = result.data.authorsTruncated;
      return buildPromptInputsText(result.data);
    });
    copyDeferredText(text)
      .then(() => {
        enqueueSnackbar('Prompt inputs copied to the clipboard', { variant: 'success' });
        if (truncated) {
          enqueueSnackbar('The author list is incomplete: the site has more authors than fit', {
            variant: 'warning',
          });
        }
      })
      .catch(() => {
        if (serverFailed) return;
        enqueueSnackbar(
          loadFailed ? 'Could not load prompt inputs' : 'Could not copy to the clipboard',
          { variant: 'error' }
        );
      })
      .finally(() => setIsCopyingPrompt(false));
  };

  const toggleSeo = (langKey: SupportedLang) => {
    setSeoExpanded((prev) => ({
      ...prev,
      [langKey]: !prev[langKey],
    }));
  };

  const handleAddFaq = (langKey: SupportedLang) => {
    const list = [...translations[langKey].faq, { question: '', answer: '' }];
    handleTranslationChange(langKey, 'faq', list);
  };

  const handleRemoveFaq = (langKey: SupportedLang, idx: number) => {
    const list = translations[langKey].faq.filter((_, i) => i !== idx);
    handleTranslationChange(langKey, 'faq', list);
  };

  const handleFaqChange = (
    langKey: SupportedLang,
    idx: number,
    field: 'question' | 'answer',
    value: string
  ) => {
    const list = translations[langKey].faq.map((f, i) =>
      i === idx ? { ...f, [field]: value } : f
    );
    handleTranslationChange(langKey, 'faq', list);
  };

  const issuesMessage = (title: string, lines: string[]): ReactNode => (
    <div>
      {title}
      <ul className={styles.notice}>
        {lines.map((line, idx) => (
          <li key={idx}>{line}</li>
        ))}
      </ul>
    </div>
  );

  // Ненайденный слаг — предупреждение, не отказ; `null` — проверка не удалась (не «всё найдено»).
  const notifySlugWarnings = (warnings: AuthorSlugWarning[] | null | undefined) => {
    if (warnings === undefined) return;
    if (warnings === null) {
      enqueueSnackbar('Could not check the links to books and authors', { variant: 'warning' });
      return;
    }
    if (warnings.length === 0) return;
    enqueueSnackbar(
      issuesMessage(
        'Not found on the site, will be shown without a link:',
        warnings.map((w) => `${w.lang} → ${w.path} → ${w.slug}`)
      ),
      { variant: 'warning', autoHideDuration: SLUG_WARNINGS_DURATION_MS }
    );
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    // Непроверенное не отправляется: сохранение ждёт модуль проверки.
    let checker: AuthorValidation;
    setIsValidating(true);
    try {
      checker = await ensureValidation();
    } catch (error) {
      reportValidationLoadFailure(error);
      return;
    } finally {
      setIsValidating(false);
    }

    const existingLangs = new Set(
      (author?.translations ?? []).map((t) => t.language as SupportedLang)
    );
    const request = buildAuthorRequest({ general, translations }, existingLangs, checker);
    if (request.kind === 'error') {
      enqueueSnackbar(request.message, { variant: 'error' });
      return;
    }
    if (request.kind === 'issues') {
      enqueueSnackbar(
        issuesMessage(
          'Fix the errors before saving:',
          request.issues.map((issue) => formatAuthorDataIssue(issue))
        ),
        { variant: 'error' }
      );
      return;
    }
    const payload = request.payload;

    try {
      if (isEditMode && author) {
        const saved = await updateMutation.mutateAsync({ id: author.id, data: payload });
        enqueueSnackbar('Author updated successfully', { variant: 'success' });
        notifySlugWarnings(saved?.warnings);
      } else {
        const saved = await createMutation.mutateAsync(payload);
        enqueueSnackbar('Author created successfully', { variant: 'success' });
        notifySlugWarnings(saved?.warnings);
      }
      router.push(`/admin/${lang}/authors`);
    } catch (error) {
      // 5xx показывает общий тост клиента; свой — только на 4xx и сбой сети.
      if (error instanceof ApiError && error.statusCode >= 500) return;
      enqueueSnackbar((error as Error).message || 'Failed to save author', { variant: 'error' });
    }
  };

  const isLoading = isValidating || createMutation.isPending || updateMutation.isPending;

  // Global shared photoUrl (retrieved from any language translation, or default null)
  const sharedPhotoUrl = SUPPORTED_LANGS.map((l) => translations[l].photoUrl).find(Boolean) || null;

  return (
    <div className={styles.container}>
      <div className={styles.headerRow}>
        <div className={styles.tabsHeader}>
          <button
            type="button"
            className={`${styles.tabBtn} ${activeTab === 'general' ? styles.active : ''}`}
            onClick={() => setActiveTab('general')}
          >
            General Settings
          </button>
          {SUPPORTED_LANGS.map((langKey) => {
            const flag = FLAG_COMPONENTS[langKey];
            const hasName = !!translations[langKey].name;
            return (
              <button
                key={langKey}
                type="button"
                className={`${styles.tabBtn} ${activeTab === langKey ? styles.active : ''}`}
                onClick={() => setActiveTab(langKey)}
              >
                {flag}
                {langKey.toUpperCase()} {hasName && <span className={styles.indicator}>●</span>}
              </button>
            );
          })}
        </div>
        {isEditMode && (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            leftIcon={<ClipboardCopy size={14} />}
            loading={isCopyingPrompt || promptInputsQuery.isFetching}
            onClick={handleCopyPromptInputs}
          >
            Prompt inputs
          </Button>
        )}
        <Button
          type="button"
          variant="secondary"
          size="sm"
          leftIcon={<Download size={14} />}
          onClick={() => setIsImportModalOpen(true)}
        >
          Import JSON
        </Button>
      </div>

      <ImportAuthorModal
        isOpen={isImportModalOpen}
        onCancel={() => setIsImportModalOpen(false)}
        analyze={analyzeImport}
        loadFailed={importLoadFailed}
        onRetryLoad={loadForImport}
        onImport={handleImport}
      />

      <form onSubmit={handleSave} className={styles.form}>
        {activeTab === 'general' && (
          <div className={styles.tabContent}>
            <div className={styles.mediaSection}>
              <MediaPicker
                value={sharedPhotoUrl}
                onChange={handlePhotoChange}
                label="Author Photo"
                allowedTypes={['image']}
                aspectRatio="square"
              />
            </div>

            <fieldset className={styles.factsFieldset}>
              <legend className={styles.label}>Portrait credit (one for all languages)</legend>
              <div className={styles.row}>
                {PHOTO_CREDIT_FIELDS.map(([field, label]) => (
                  <div key={field} className={styles.field}>
                    <label htmlFor={`photoCredit-${field}`} className={styles.label}>
                      {label}
                    </label>
                    <Input
                      id={`photoCredit-${field}`}
                      value={general.photoCredit[field]}
                      onChange={(e) => handlePhotoCreditChange(field, e.target.value)}
                    />
                  </div>
                ))}
              </div>
            </fieldset>

            <div className={styles.field}>
              <label htmlFor="nativeName" className={styles.label}>
                Name in the native language
              </label>
              <Input
                id="nativeName"
                value={general.nativeName}
                maxLength={AUTHOR_PAGE_LIMITS.nativeName}
                onChange={(e) => handleGeneralChange('nativeName', e.target.value)}
                placeholder="Лев Николаевич Толстой"
              />
            </div>

            <div className={styles.row}>
              <div className={styles.field}>
                <label htmlFor="birthDate" className={styles.label}>
                  Birth Date (YYYY-MM-DD or YYYY)
                </label>
                <Input
                  id="birthDate"
                  value={general.birthDate}
                  onChange={(e) => handleGeneralChange('birthDate', e.target.value)}
                  placeholder="YYYY-MM-DD or YYYY"
                />
              </div>
              <div className={styles.field}>
                <label htmlFor="deathDate" className={styles.label}>
                  Death Date (YYYY-MM-DD or YYYY)
                </label>
                <Input
                  id="deathDate"
                  value={general.deathDate}
                  onChange={(e) => handleGeneralChange('deathDate', e.target.value)}
                  placeholder="YYYY-MM-DD or YYYY"
                />
              </div>
            </div>
          </div>
        )}

        {SUPPORTED_LANGS.includes(activeTab as SupportedLang) &&
          (() => {
            const langKey = activeTab as SupportedLang;
            const trans = translations[langKey];
            return (
              <div className={styles.tabContent}>
                <div className={styles.field}>
                  <label htmlFor={`name-${langKey}`} className={styles.label}>
                    Author Name ({langKey.toUpperCase()}) *
                  </label>
                  <Input
                    id={`name-${langKey}`}
                    value={trans.name}
                    onChange={(e) => handleTranslationChange(langKey, 'name', e.target.value)}
                    placeholder="e.g. Oscar Wilde"
                  />
                </div>

                <div className={styles.field}>
                  <label htmlFor={`slug-${langKey}`} className={styles.label}>
                    Slug ({langKey.toUpperCase()}) *
                  </label>
                  <SlugInput
                    id={`slug-${langKey}`}
                    value={trans.slug}
                    onChange={(val) => handleTranslationChange(langKey, 'slug', val)}
                    error={!trans.slug && trans.name ? 'Slug is required' : undefined}
                    sourceValue={trans.name}
                    entityType="book"
                    lang={langKey}
                    mode={isEditMode ? 'edit' : 'create'}
                    autoGenerate={!isEditMode || !trans.slug}
                  />
                </div>

                <div className={styles.field}>
                  <label htmlFor={`tagline-${langKey}`} className={styles.label}>
                    Tagline (up to {AUTHOR_PAGE_LIMITS.tagline} characters)
                  </label>
                  <Input
                    id={`tagline-${langKey}`}
                    value={trans.tagline}
                    maxLength={AUTHOR_PAGE_LIMITS.tagline}
                    onChange={(e) => handleTranslationChange(langKey, 'tagline', e.target.value)}
                  />
                </div>

                <div className={styles.field}>
                  <label htmlFor={`wikidataUrl-${langKey}`} className={styles.label}>
                    Wikidata URL ({langKey.toUpperCase()})
                  </label>
                  <Input
                    id={`wikidataUrl-${langKey}`}
                    value={trans.wikidataUrl}
                    onChange={(e) =>
                      handleTranslationChange(langKey, 'wikidataUrl', e.target.value)
                    }
                    placeholder="https://www.wikidata.org/wiki/Q30875"
                  />
                </div>

                <div className={styles.field}>
                  <label htmlFor={`wikipediaUrl-${langKey}`} className={styles.label}>
                    Wikipedia URL ({langKey.toUpperCase()})
                  </label>
                  <Input
                    id={`wikipediaUrl-${langKey}`}
                    value={trans.wikipediaUrl}
                    onChange={(e) =>
                      handleTranslationChange(langKey, 'wikipediaUrl', e.target.value)
                    }
                    placeholder="https://en.wikipedia.org/wiki/Oscar_Wilde"
                  />
                </div>

                <div className={styles.field}>
                  <label htmlFor={`biography-${langKey}`} className={styles.label}>
                    Biography ({langKey.toUpperCase()})
                  </label>
                  <AdminRichTextEditor
                    value={trans.biography}
                    onChange={(val) => handleTranslationChange(langKey, 'biography', val)}
                    placeholder="Enter biography details..."
                    ariaLabel={`Biography details for ${langKey}`}
                  />
                </div>

                <AuthorFactsFields
                  lang={langKey}
                  facts={trans.facts}
                  onChange={(field, value) => handleFactsChange(langKey, field, value)}
                />

                <div className={styles.field}>
                  <div className={styles.sectionHeader}>
                    <span className={styles.label}>Page blocks (JSON)</span>
                  </div>
                  <p className={styles.hint}>
                    Each block is replaced as a whole. Empty field means no block.
                  </p>
                </div>
                {AUTHOR_BLOCK_KEYS.map((key) => (
                  <AuthorBlockEditor
                    key={key}
                    id={`block-${key}-${langKey}`}
                    label={BLOCK_LABELS[key]}
                    draft={trans.drafts[key]}
                    onChange={(text) => handleBlockChange(langKey, key, text)}
                  />
                ))}

                <div className={styles.field}>
                  <div className={styles.sectionHeader}>
                    <span className={styles.label}>FAQ</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      type="button"
                      onClick={() => handleAddFaq(langKey)}
                    >
                      + Add FAQ
                    </Button>
                  </div>
                  {trans.faq.map((f, idx) => (
                    <div key={idx} className={styles.faqBlock}>
                      <div className={styles.faqInputs}>
                        <Input
                          value={f.question}
                          maxLength={FAQ_QUESTION_MAX_LENGTH}
                          onChange={(e) =>
                            handleFaqChange(langKey, idx, 'question', e.target.value)
                          }
                          placeholder="Question"
                        />
                        <Input
                          value={f.answer}
                          maxLength={FAQ_ANSWER_MAX_LENGTH}
                          onChange={(e) => handleFaqChange(langKey, idx, 'answer', e.target.value)}
                          placeholder="Answer"
                        />
                      </div>
                      <Button
                        variant="ghost"
                        type="button"
                        onClick={() => handleRemoveFaq(langKey, idx)}
                        className={styles.removeBtn}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>

                <div className={styles.field}>
                  <label htmlFor={`similarSlugs-${langKey}`} className={styles.label}>
                    Similar Author Slugs (comma-separated)
                  </label>
                  <Input
                    id={`similarSlugs-${langKey}`}
                    value={trans.similarSlugs}
                    onChange={(e) =>
                      handleTranslationChange(langKey, 'similarSlugs', e.target.value)
                    }
                    placeholder="e.g. oscar-wilde, leo-tolstoy"
                  />
                </div>

                {/* Localized SEO section */}
                <div className={styles.seoContainer}>
                  <button
                    type="button"
                    className={styles.seoHeader}
                    onClick={() => toggleSeo(langKey)}
                  >
                    <h3>SEO Settings ({langKey.toUpperCase()})</h3>
                    <span>{seoExpanded[langKey] ? '▼' : '►'}</span>
                  </button>

                  {seoExpanded[langKey] && (
                    <div className={styles.seoContent}>
                      <div className={styles.field}>
                        <label htmlFor={`metaTitle-${langKey}`} className={styles.label}>
                          Meta Title
                        </label>
                        <Input
                          id={`metaTitle-${langKey}`}
                          value={trans.seo.metaTitle || ''}
                          onChange={(e) => handleSeoChange(langKey, 'metaTitle', e.target.value)}
                          placeholder="e.g. Oscar Wilde - Books, Biography & Audiobooks"
                        />
                      </div>

                      <div className={styles.field}>
                        <label htmlFor={`metaDescription-${langKey}`} className={styles.label}>
                          Meta Description
                        </label>
                        <textarea
                          id={`metaDescription-${langKey}`}
                          className={styles.textarea}
                          rows={3}
                          value={trans.seo.metaDescription || ''}
                          onChange={(e) =>
                            handleSeoChange(langKey, 'metaDescription', e.target.value)
                          }
                          placeholder="Enter SEO meta description..."
                        />
                      </div>

                      <div className={styles.row}>
                        <div className={styles.field}>
                          <label htmlFor={`canonicalUrl-${langKey}`} className={styles.label}>
                            Canonical URL
                          </label>
                          <Input
                            id={`canonicalUrl-${langKey}`}
                            value={trans.seo.canonicalUrl || ''}
                            onChange={(e) =>
                              handleSeoChange(langKey, 'canonicalUrl', e.target.value)
                            }
                            placeholder="https://example.com/author/oscar-wilde"
                          />
                        </div>
                        <div className={styles.field}>
                          <label htmlFor={`robots-${langKey}`} className={styles.label}>
                            Robots
                          </label>
                          <select
                            id={`robots-${langKey}`}
                            className={styles.select}
                            value={trans.seo.robots || 'index, follow'}
                            onChange={(e) => handleSeoChange(langKey, 'robots', e.target.value)}
                          >
                            <option value="index, follow">index, follow (recommended)</option>
                            <option value="noindex, follow">noindex, follow</option>
                            <option value="index, nofollow">index, nofollow</option>
                            <option value="noindex, nofollow">noindex, nofollow</option>
                          </select>
                        </div>
                      </div>

                      <div className={styles.field}>
                        <label htmlFor={`ogTitle-${langKey}`} className={styles.label}>
                          Open Graph Title
                        </label>
                        <Input
                          id={`ogTitle-${langKey}`}
                          value={trans.seo.ogTitle || ''}
                          onChange={(e) => handleSeoChange(langKey, 'ogTitle', e.target.value)}
                        />
                      </div>

                      <div className={styles.field}>
                        <label htmlFor={`ogDescription-${langKey}`} className={styles.label}>
                          Open Graph Description
                        </label>
                        <textarea
                          id={`ogDescription-${langKey}`}
                          className={styles.textarea}
                          rows={3}
                          value={trans.seo.ogDescription || ''}
                          onChange={(e) =>
                            handleSeoChange(langKey, 'ogDescription', e.target.value)
                          }
                        />
                      </div>

                      <div className={styles.row}>
                        <div className={styles.field}>
                          <label htmlFor={`ogImageUrl-${langKey}`} className={styles.label}>
                            Open Graph Image URL
                          </label>
                          <Input
                            id={`ogImageUrl-${langKey}`}
                            value={trans.seo.ogImageUrl || ''}
                            onChange={(e) => handleSeoChange(langKey, 'ogImageUrl', e.target.value)}
                          />
                        </div>
                        <div className={styles.field}>
                          <label htmlFor={`ogImageAlt-${langKey}`} className={styles.label}>
                            Open Graph Image Alt
                          </label>
                          <Input
                            id={`ogImageAlt-${langKey}`}
                            value={trans.seo.ogImageAlt || ''}
                            onChange={(e) => handleSeoChange(langKey, 'ogImageAlt', e.target.value)}
                          />
                        </div>
                      </div>

                      <div className={styles.field}>
                        <label htmlFor={`twitterCard-${langKey}`} className={styles.label}>
                          Twitter Card Type
                        </label>
                        <select
                          id={`twitterCard-${langKey}`}
                          className={styles.select}
                          value={trans.seo.twitterCard || 'summary'}
                          onChange={(e) => handleSeoChange(langKey, 'twitterCard', e.target.value)}
                        >
                          <option value="summary">Summary</option>
                          <option value="summary_large_image">Summary Large Image</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

        <div className={styles.actions}>
          <Button
            variant="ghost"
            onClick={() => router.push(`/admin/${lang}/authors`)}
            type="button"
          >
            Cancel
          </Button>
          <Button variant="primary" type="submit" loading={isLoading}>
            {isEditMode ? 'Save Changes' : 'Create Author'}
          </Button>
        </div>
      </form>
    </div>
  );
};
