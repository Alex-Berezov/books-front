'use client';

import { useEffect, useState, type FC } from 'react';
import { useRouter } from 'next/navigation';
import { useSnackbar } from 'notistack';
import { useCreateAuthor, useUpdateAuthor } from '@/api/hooks/useAuthors';
import { MediaPicker } from '@/components/admin/common/MediaPicker/MediaPicker';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { SlugInput } from '@/components/common/SlugInput';
import { FLAG_COMPONENTS } from '@/lib/i18n/FlagIcon';
import { SUPPORTED_LANGS, type SupportedLang } from '@/lib/i18n/lang';
import type {
  Author,
  AuthorTranslation,
  AuthorQuote,
  AuthorFaq,
  SeoData,
} from '@/types/api-schema';
import styles from './AuthorForm.module.scss';

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

  // Form states
  const [slug, setSlug] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [deathDate, setDeathDate] = useState('');
  const [wikidataUrl, setWikidataUrl] = useState('');
  const [wikipediaUrl, setWikipediaUrl] = useState('');
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

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
        seo: Partial<SeoData>;
      }
    >
  >({
    en: { name: '', biography: '', quotes: [], faq: [], similarSlugs: '', seo: {} },
    es: { name: '', biography: '', quotes: [], faq: [], similarSlugs: '', seo: {} },
    fr: { name: '', biography: '', quotes: [], faq: [], similarSlugs: '', seo: {} },
    pt: { name: '', biography: '', quotes: [], faq: [], similarSlugs: '', seo: {} },
    ru: { name: '', biography: '', quotes: [], faq: [], similarSlugs: '', seo: {} },
  });

  // Load initial data
  useEffect(() => {
    if (author) {
      setSlug(author.slug);
      setBirthDate(author.birthDate || '');
      setDeathDate(author.deathDate || '');
      setWikidataUrl(author.wikidataUrl || '');
      setWikipediaUrl(author.wikipediaUrl || '');
      setPhotoUrl(author.photoUrl || null);

      const mappedTrans: Record<
        SupportedLang,
        {
          name: string;
          biography: string;
          quotes: AuthorQuote[];
          faq: AuthorFaq[];
          similarSlugs: string;
          seo: Partial<SeoData>;
        }
      > = {
        en: { name: '', biography: '', quotes: [], faq: [], similarSlugs: '', seo: {} },
        es: { name: '', biography: '', quotes: [], faq: [], similarSlugs: '', seo: {} },
        fr: { name: '', biography: '', quotes: [], faq: [], similarSlugs: '', seo: {} },
        pt: { name: '', biography: '', quotes: [], faq: [], similarSlugs: '', seo: {} },
        ru: { name: '', biography: '', quotes: [], faq: [], similarSlugs: '', seo: {} },
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
              seo: t.seo || {},
            };
          }
        });
      }
      setTranslations(mappedTrans);
    }
  }, [author]);

  // Translation helpers
  const handleTranslationChange = (
    langKey: SupportedLang,
    field: string,
    value: string | AuthorQuote[] | AuthorFaq[] | Partial<SeoData>
  ) => {
    setTranslations((prev) => ({
      ...prev,
      [langKey]: {
        ...prev[langKey],
        [field]: value,
      },
    }));
  };

  const handleSeoChange = (langKey: SupportedLang, field: keyof SeoData, value: string) => {
    setTranslations((prev) => ({
      ...prev,
      [langKey]: {
        ...prev[langKey],
        seo: {
          ...prev[langKey].seo,
          [field]: value,
        },
      },
    }));
  };

  const toggleSeo = (langKey: SupportedLang) => {
    setSeoExpanded((prev) => ({
      ...prev,
      [langKey]: !prev[langKey],
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
        const seoData: Record<string, string | number> = {};
        Object.entries(transData.seo).forEach(([k, v]) => {
          if (v !== undefined && v !== null && v !== '') {
            seoData[k] = v;
          }
        });

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
          seo: Object.keys(seoData).length > 0 ? (seoData as unknown as SeoData) : undefined,
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
      photoUrl: photoUrl || null,
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
      router.push(`/admin/${lang}/authors`);
    } catch (error) {
      enqueueSnackbar((error as Error).message || 'Failed to save author', { variant: 'error' });
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <div className={styles.container}>
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
            <div className={styles.mediaSection}>
              <MediaPicker
                value={photoUrl}
                onChange={setPhotoUrl}
                label="Author Photo"
                allowedTypes={['image']}
              />
            </div>

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
                    rows={6}
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
                          <Input
                            id={`robots-${langKey}`}
                            value={trans.seo.robots || 'index, follow'}
                            onChange={(e) => handleSeoChange(langKey, 'robots', e.target.value)}
                          />
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
