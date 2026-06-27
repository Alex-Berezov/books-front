'use client';

import { useEffect, useState, type FC } from 'react';
import { Download } from 'lucide-react';
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
import { ImportAuthorModal } from './ImportAuthorModal';

interface AuthorFormProps {
  author?: Author | null;
  lang: string;
}

interface FormTranslationState {
  name: string;
  slug: string;
  biography: string;
  wikidataUrl: string;
  wikipediaUrl: string;
  photoUrl: string | null;
  quotes: AuthorQuote[];
  faq: AuthorFaq[];
  similarSlugs: string;
  seo: Partial<SeoData>;
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

  // Global life dates
  const [birthDate, setBirthDate] = useState('');
  const [deathDate, setDeathDate] = useState('');
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // Translations states containing all localized fields
  const [translations, setTranslations] = useState<Record<SupportedLang, FormTranslationState>>({
    en: {
      name: '',
      slug: '',
      biography: '',
      wikidataUrl: '',
      wikipediaUrl: '',
      photoUrl: null,
      quotes: [],
      faq: [],
      similarSlugs: '',
      seo: { robots: 'index, follow', twitterCard: 'summary' },
    },
    es: {
      name: '',
      slug: '',
      biography: '',
      wikidataUrl: '',
      wikipediaUrl: '',
      photoUrl: null,
      quotes: [],
      faq: [],
      similarSlugs: '',
      seo: { robots: 'index, follow', twitterCard: 'summary' },
    },
    fr: {
      name: '',
      slug: '',
      biography: '',
      wikidataUrl: '',
      wikipediaUrl: '',
      photoUrl: null,
      quotes: [],
      faq: [],
      similarSlugs: '',
      seo: { robots: 'index, follow', twitterCard: 'summary' },
    },
    pt: {
      name: '',
      slug: '',
      biography: '',
      wikidataUrl: '',
      wikipediaUrl: '',
      photoUrl: null,
      quotes: [],
      faq: [],
      similarSlugs: '',
      seo: { robots: 'index, follow', twitterCard: 'summary' },
    },
    ru: {
      name: '',
      slug: '',
      biography: '',
      wikidataUrl: '',
      wikipediaUrl: '',
      photoUrl: null,
      quotes: [],
      faq: [],
      similarSlugs: '',
      seo: { robots: 'index, follow', twitterCard: 'summary' },
    },
  });

  // Load initial data
  useEffect(() => {
    if (author) {
      setBirthDate(author.birthDate || '');
      setDeathDate(author.deathDate || '');

      const mappedTrans: Record<SupportedLang, FormTranslationState> = {
        en: {
          name: '',
          slug: '',
          biography: '',
          wikidataUrl: '',
          wikipediaUrl: '',
          photoUrl: null,
          quotes: [],
          faq: [],
          similarSlugs: '',
          seo: { robots: 'index, follow', twitterCard: 'summary' },
        },
        es: {
          name: '',
          slug: '',
          biography: '',
          wikidataUrl: '',
          wikipediaUrl: '',
          photoUrl: null,
          quotes: [],
          faq: [],
          similarSlugs: '',
          seo: { robots: 'index, follow', twitterCard: 'summary' },
        },
        fr: {
          name: '',
          slug: '',
          biography: '',
          wikidataUrl: '',
          wikipediaUrl: '',
          photoUrl: null,
          quotes: [],
          faq: [],
          similarSlugs: '',
          seo: { robots: 'index, follow', twitterCard: 'summary' },
        },
        pt: {
          name: '',
          slug: '',
          biography: '',
          wikidataUrl: '',
          wikipediaUrl: '',
          photoUrl: null,
          quotes: [],
          faq: [],
          similarSlugs: '',
          seo: { robots: 'index, follow', twitterCard: 'summary' },
        },
        ru: {
          name: '',
          slug: '',
          biography: '',
          wikidataUrl: '',
          wikipediaUrl: '',
          photoUrl: null,
          quotes: [],
          faq: [],
          similarSlugs: '',
          seo: { robots: 'index, follow', twitterCard: 'summary' },
        },
      };

      if (author.translations) {
        author.translations.forEach((t) => {
          const l = t.language as SupportedLang;
          if (mappedTrans[l]) {
            mappedTrans[l] = {
              name: t.name,
              slug: t.slug,
              biography: t.biography || '',
              wikidataUrl: t.wikidataUrl || '',
              wikipediaUrl: t.wikipediaUrl || '',
              photoUrl: t.photoUrl || null,
              quotes: (t.quotes as AuthorQuote[]) || [],
              faq: (t.faq as AuthorFaq[]) || [],
              similarSlugs: ((t.similarSlugs as string[]) || []).join(', '),
              seo: {
                robots: 'index, follow',
                twitterCard: 'summary',
                ...t.seo,
              },
            };
          }
        });
      }
      setTranslations(mappedTrans);
    }
  }, [author]);

  // Sync photo across all languages if set in one
  const handlePhotoChange = (newPhotoUrl: string | null) => {
    setTranslations((prev) => {
      const updated = { ...prev };
      SUPPORTED_LANGS.forEach((l) => {
        updated[l] = {
          ...updated[l],
          photoUrl: newPhotoUrl,
        };
        // Always update SEO ogImageUrl to match the photo URL
        updated[l].seo = {
          ...updated[l].seo,
          ogImageUrl: newPhotoUrl || '',
        };
      });
      return updated;
    });
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

  const handleImportJson = (jsonDataString: string) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = JSON.parse(jsonDataString) as any;

    if (data.birthDate !== undefined) {
      setBirthDate(data.birthDate || '');
    }
    if (data.deathDate !== undefined) {
      setDeathDate(data.deathDate || '');
    }

    if (data.translations) {
      // Find a shared photoUrl across all translations if present
      const jsonPhotoUrl =
        SUPPORTED_LANGS.map((l) => data.translations?.[l]?.photoUrl).find(Boolean) || null;

      setTranslations((prev) => {
        const updated = { ...prev };
        SUPPORTED_LANGS.forEach((l) => {
          const trans = data.translations[l];
          if (trans) {
            const photoVal = trans.photoUrl || jsonPhotoUrl || prev[l].photoUrl;
            updated[l] = {
              name: trans.name || prev[l].name || '',
              slug: trans.slug || prev[l].slug || '',
              biography: trans.biography || prev[l].biography || '',
              wikidataUrl: trans.wikidataUrl || prev[l].wikidataUrl || '',
              wikipediaUrl: trans.wikipediaUrl || prev[l].wikipediaUrl || '',
              photoUrl: photoVal,
              quotes: Array.isArray(trans.quotes) ? trans.quotes : prev[l].quotes || [],
              faq: Array.isArray(trans.faq) ? trans.faq : prev[l].faq || [],
              similarSlugs:
                typeof trans.similarSlugs === 'string'
                  ? trans.similarSlugs
                  : Array.isArray(trans.similarSlugs)
                    ? trans.similarSlugs.join(', ')
                    : prev[l].similarSlugs || '',
              seo: {
                robots: 'index, follow',
                twitterCard: 'summary',
                ...prev[l].seo,
                ...(trans.seo || {}),
                ogTitle:
                  trans.seo?.ogTitle ||
                  trans.seo?.metaTitle ||
                  trans.metaTitle ||
                  prev[l].seo.ogTitle ||
                  '',
                ogDescription:
                  trans.seo?.ogDescription ||
                  trans.seo?.metaDescription ||
                  trans.metaDescription ||
                  prev[l].seo.ogDescription ||
                  '',
                ogImageUrl: trans.seo?.ogImageUrl || photoVal || prev[l].seo.ogImageUrl || '',
                canonicalUrl:
                  trans.seo?.canonicalUrl ||
                  (trans.slug
                    ? `https://bibliaris.com/${l}/author/${trans.slug}`
                    : prev[l].seo.canonicalUrl || ''),
              },
            };
          }
        });
        return updated;
      });
      enqueueSnackbar('Data imported successfully!', { variant: 'success' });
    } else {
      throw new Error('No translations found in JSON.');
    }
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

    // Filter translations to only save languages that have a name and a slug filled
    const activeTranslations: AuthorTranslation[] = [];
    for (const langKey of SUPPORTED_LANGS) {
      const transData = translations[langKey];
      if (transData.name.trim()) {
        if (!transData.slug.trim()) {
          enqueueSnackbar(`Slug is required for language ${langKey.toUpperCase()}`, {
            variant: 'error',
          });
          return;
        }

        const seoData: Record<string, string | number> = {};
        const excludedSeoKeys = ['id', 'createdAt', 'updatedAt', 'seoId', 'authorTranslationId'];
        Object.entries(transData.seo).forEach(([k, v]) => {
          if (!excludedSeoKeys.includes(k) && v !== undefined && v !== null && v !== '') {
            seoData[k] = v;
          }
        });

        activeTranslations.push({
          language: langKey,
          slug: transData.slug.trim(),
          name: transData.name.trim(),
          biography: transData.biography.trim() || null,
          wikidataUrl: transData.wikidataUrl.trim() || null,
          wikipediaUrl: transData.wikipediaUrl.trim() || null,
          photoUrl: transData.photoUrl || null,
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
      birthDate: birthDate || null,
      deathDate: deathDate || null,
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
        onImport={handleImportJson}
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
                    autoGenerate={!isEditMode || !trans.slug}
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
