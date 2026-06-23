'use client';

import { useEffect, useState, type FC } from 'react';
import { useSnackbar } from 'notistack';
import { useCreateAuthor, useUpdateAuthor } from '@/api/hooks/useAuthors';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { Modal } from '@/components/common/Modal';
import { SlugInput } from '@/components/common/SlugInput';
import { FLAG_COMPONENTS } from '@/lib/i18n/FlagIcon';
import { SUPPORTED_LANGS, type SupportedLang } from '@/lib/i18n/lang';
import type { Author, AuthorTranslation, AuthorQuote, AuthorFaq } from '@/types/api-schema';
import styles from './AuthorModal.module.scss';

interface AuthorModalProps {
  isOpen: boolean;
  onClose: () => void;
  author: Author | null;
  lang: string;
}

export const AuthorModal: FC<AuthorModalProps> = (props) => {
  const { isOpen, onClose, author, lang } = props;
  const { enqueueSnackbar } = useSnackbar();
  const isEditMode = !!author;

  const createMutation = useCreateAuthor();
  const updateMutation = useUpdateAuthor();

  // Active tab state: 'general' | SupportedLang
  const [activeTab, setActiveTab] = useState<string>('general');

  // Form states
  const [slug, setSlug] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [deathDate, setDeathDate] = useState('');
  const [wikidataUrl, setWikidataUrl] = useState('');
  const [wikipediaUrl, setWikipediaUrl] = useState('');

  // Translations states
  const [translations, setTranslations] = useState<
    Record<
      SupportedLang,
      {
        name: string;
        biography: string;
        quotes: AuthorQuote[];
        faq: AuthorFaq[];
        similarSlugs: string;
      }
    >
  >({
    en: { name: '', biography: '', quotes: [], faq: [], similarSlugs: '' },
    es: { name: '', biography: '', quotes: [], faq: [], similarSlugs: '' },
    fr: { name: '', biography: '', quotes: [], faq: [], similarSlugs: '' },
    pt: { name: '', biography: '', quotes: [], faq: [], similarSlugs: '' },
    ru: { name: '', biography: '', quotes: [], faq: [], similarSlugs: '' },
  });

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setActiveTab('general');
      if (author) {
        setSlug(author.slug);
        setBirthDate(author.birthDate || '');
        setDeathDate(author.deathDate || '');
        setWikidataUrl(author.wikidataUrl || '');
        setWikipediaUrl(author.wikipediaUrl || '');

        const mappedTrans: Record<
          SupportedLang,
          {
            name: string;
            biography: string;
            quotes: AuthorQuote[];
            faq: AuthorFaq[];
            similarSlugs: string;
          }
        > = {
          en: { name: '', biography: '', quotes: [], faq: [], similarSlugs: '' },
          es: { name: '', biography: '', quotes: [], faq: [], similarSlugs: '' },
          fr: { name: '', biography: '', quotes: [], faq: [], similarSlugs: '' },
          pt: { name: '', biography: '', quotes: [], faq: [], similarSlugs: '' },
          ru: { name: '', biography: '', quotes: [], faq: [], similarSlugs: '' },
        };

        if (author.translations) {
          author.translations.forEach((t) => {
            const l = t.language as SupportedLang;
            if (mappedTrans[l]) {
              mappedTrans[l] = {
                name: t.name,
                biography: t.biography || '',
                quotes: (t.quotes as AuthorQuote[]) || [],
                faq: (t.faq as AuthorFaq[]) || [],
                similarSlugs: ((t.similarSlugs as string[]) || []).join(', '),
              };
            }
          });
        }
        setTranslations(mappedTrans);
      } else {
        setSlug('');
        setBirthDate('');
        setDeathDate('');
        setWikidataUrl('');
        setWikipediaUrl('');
        setTranslations({
          en: { name: '', biography: '', quotes: [], faq: [], similarSlugs: '' },
          es: { name: '', biography: '', quotes: [], faq: [], similarSlugs: '' },
          fr: { name: '', biography: '', quotes: [], faq: [], similarSlugs: '' },
          pt: { name: '', biography: '', quotes: [], faq: [], similarSlugs: '' },
          ru: { name: '', biography: '', quotes: [], faq: [], similarSlugs: '' },
        });
      }
    }
  }, [isOpen, author]);

  // Translation helpers
  const handleTranslationChange = (
    langKey: SupportedLang,
    field: string,
    value: string | AuthorQuote[] | AuthorFaq[]
  ) => {
    setTranslations((prev) => ({
      ...prev,
      [langKey]: {
        ...prev[langKey],
        [field]: value,
      },
    }));
  };

  const handleAddQuote = (langKey: SupportedLang) => {
    const list = [...translations[langKey].quotes, { text: '', source: '' }];
    handleTranslationChange(langKey, 'quotes', list);
  };

  const handleRemoveQuote = (langKey: SupportedLang, idx: number) => {
    const list = translations[langKey].quotes.filter((_, i) => i !== idx);
    handleTranslationChange(langKey, 'quotes', list);
  };

  const handleQuoteChange = (
    langKey: SupportedLang,
    idx: number,
    field: 'text' | 'source',
    value: string
  ) => {
    const list = translations[langKey].quotes.map((q, i) =>
      i === idx ? { ...q, [field]: value } : q
    );
    handleTranslationChange(langKey, 'quotes', list);
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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!slug) {
      enqueueSnackbar('Slug is required', { variant: 'error' });
      return;
    }

    // Filter translations to only save languages that have a name filled
    const activeTranslations: AuthorTranslation[] = [];
    for (const langKey of SUPPORTED_LANGS) {
      const transData = translations[langKey];
      if (transData.name.trim()) {
        activeTranslations.push({
          language: langKey,
          name: transData.name.trim(),
          biography: transData.biography.trim() || null,
          quotes: transData.quotes.filter((q) => q.text.trim()) || [],
          faq: transData.faq.filter((f) => f.question.trim() && f.answer.trim()) || [],
          similarSlugs: transData.similarSlugs
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
        });
      }
    }

    if (activeTranslations.length === 0) {
      enqueueSnackbar('At least one translation with a name is required', { variant: 'error' });
      return;
    }

    const payload = {
      slug,
      birthDate: birthDate || null,
      deathDate: deathDate || null,
      wikidataUrl: wikidataUrl || null,
      wikipediaUrl: wikipediaUrl || null,
      translations: activeTranslations,
    };

    try {
      if (isEditMode && author) {
        await updateMutation.mutateAsync({ id: author.id, data: payload });
        enqueueSnackbar('Author updated successfully', { variant: 'success' });
      } else {
        await createMutation.mutateAsync(payload);
        enqueueSnackbar('Author created successfully', { variant: 'success' });
      }
      onClose();
    } catch (error) {
      enqueueSnackbar((error as Error).message || 'Failed to save author', { variant: 'error' });
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <Modal
      isOpen={isOpen}
      onCancel={onClose}
      title={isEditMode ? 'Edit Author' : 'Create Author'}
      showFooter={false}
      size="lg"
    >
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

      <form onSubmit={handleSave} className={styles.form}>
        {activeTab === 'general' && (
          <div className={styles.tabContent}>
            <div className={styles.field}>
              <label htmlFor="slug" className={styles.label}>
                Slug *
              </label>
              <SlugInput
                id="slug"
                value={slug}
                onChange={setSlug}
                error={!slug ? 'Slug is required' : undefined}
                sourceValue={translations['en']?.name}
                entityType="book"
                lang={lang as SupportedLang}
                autoGenerate={!isEditMode}
              />
            </div>

            <div className={styles.row}>
              <div className={styles.field}>
                <label htmlFor="birthDate" className={styles.label}>
                  Birth Date (e.g. 1854-10-16)
                </label>
                <Input
                  id="birthDate"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  placeholder="YYYY-MM-DD"
                />
              </div>
              <div className={styles.field}>
                <label htmlFor="deathDate" className={styles.label}>
                  Death Date (e.g. 1900-11-30)
                </label>
                <Input
                  id="deathDate"
                  value={deathDate}
                  onChange={(e) => setDeathDate(e.target.value)}
                  placeholder="YYYY-MM-DD"
                />
              </div>
            </div>

            <div className={styles.field}>
              <label htmlFor="wikidataUrl" className={styles.label}>
                Wikidata URL
              </label>
              <Input
                id="wikidataUrl"
                value={wikidataUrl}
                onChange={(e) => setWikidataUrl(e.target.value)}
                placeholder="https://www.wikidata.org/wiki/Q30875"
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="wikipediaUrl" className={styles.label}>
                Wikipedia URL
              </label>
              <Input
                id="wikipediaUrl"
                value={wikipediaUrl}
                onChange={(e) => setWikipediaUrl(e.target.value)}
                placeholder="https://en.wikipedia.org/wiki/Oscar_Wilde"
              />
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
                    Author Name ({langKey.toUpperCase()})
                  </label>
                  <Input
                    id={`name-${langKey}`}
                    value={trans.name}
                    onChange={(e) => handleTranslationChange(langKey, 'name', e.target.value)}
                    placeholder="e.g. Oscar Wilde"
                  />
                </div>

                <div className={styles.field}>
                  <label htmlFor={`biography-${langKey}`} className={styles.label}>
                    Biography ({langKey.toUpperCase()})
                  </label>
                  <textarea
                    id={`biography-${langKey}`}
                    className={styles.textarea}
                    rows={4}
                    value={trans.biography}
                    onChange={(e) => handleTranslationChange(langKey, 'biography', e.target.value)}
                    placeholder="Enter biography details..."
                  />
                </div>

                <div className={styles.field}>
                  <div className={styles.sectionHeader}>
                    <span className={styles.label}>Quotes</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      type="button"
                      onClick={() => handleAddQuote(langKey)}
                    >
                      + Add Quote
                    </Button>
                  </div>
                  {trans.quotes.map((q, idx) => (
                    <div key={idx} className={styles.subItemRow}>
                      <Input
                        value={q.text}
                        onChange={(e) => handleQuoteChange(langKey, idx, 'text', e.target.value)}
                        placeholder="Quote text"
                        className={styles.quoteText}
                      />
                      <Input
                        value={q.source || ''}
                        onChange={(e) => handleQuoteChange(langKey, idx, 'source', e.target.value)}
                        placeholder="Source (optional)"
                        className={styles.quoteSource}
                      />
                      <Button
                        variant="ghost"
                        type="button"
                        onClick={() => handleRemoveQuote(langKey, idx)}
                        className={styles.removeBtn}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>

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
                          onChange={(e) =>
                            handleFaqChange(langKey, idx, 'question', e.target.value)
                          }
                          placeholder="Question"
                        />
                        <Input
                          value={f.answer}
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
              </div>
            );
          })()}

        <div className={styles.actions}>
          <Button variant="ghost" onClick={onClose} type="button">
            Cancel
          </Button>
          <Button variant="primary" type="submit" loading={isLoading}>
            {isEditMode ? 'Save Changes' : 'Create Author'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
