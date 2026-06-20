'use client';

import { useState, type FC } from 'react';
import { useFieldArray } from 'react-hook-form';
import { useThemes } from '@/api/hooks/useBooks';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import type { BookFormData } from './BookForm.types';
import type {
  Control,
  FieldErrors,
  UseFormRegister,
  UseFormSetValue,
  UseFormWatch,
} from 'react-hook-form';
import styles from './BookForm.module.scss';

interface DetailInfoSectionProps {
  register: UseFormRegister<BookFormData>;
  control: Control<BookFormData>;
  errors: FieldErrors<BookFormData>;
  watch: UseFormWatch<BookFormData>;
  setValue: UseFormSetValue<BookFormData>;
}

export const DetailInfoSection: FC<DetailInfoSectionProps> = (props) => {
  const { register, control, errors, watch, setValue } = props;

  // React Query hook to get all unique themes for autocomplete
  const { data: allExistingThemes = [] } = useThemes();

  // Local state for adding themes
  const [themeInput, setThemeInput] = useState('');
  const [showThemeDropdown, setShowThemeDropdown] = useState(false);

  // Local state for adding character
  const [newCharName, setNewCharName] = useState('');
  const [newCharDesc, setNewCharDesc] = useState('');

  // Local state for adding quote
  const [newQuoteText, setNewQuoteText] = useState('');
  const [newQuoteAuthor, setNewQuoteAuthor] = useState('');

  // Local state for adding FAQ
  const [newFaqQuestion, setNewFaqQuestion] = useState('');
  const [newFaqAnswer, setNewFaqAnswer] = useState('');

  // Local state for alternativeTitles
  const [altTitleInput, setAltTitleInput] = useState('');

  // Local state for adding symbols
  const [newSymbolTitle, setNewSymbolTitle] = useState('');
  const [newSymbolDesc, setNewSymbolDesc] = useState('');

  // Manage symbols using useFieldArray
  const {
    fields: symbolFields,
    append: appendSymbol,
    remove: removeSymbol,
  } = useFieldArray({
    control,
    name: 'symbols',
  });

  // Manage characters using useFieldArray
  const {
    fields: characterFields,
    append: appendCharacter,
    remove: removeCharacter,
  } = useFieldArray({
    control,
    name: 'characters',
  });

  // Manage quotes using useFieldArray
  const {
    fields: quoteFields,
    append: appendQuote,
    remove: removeQuote,
  } = useFieldArray({
    control,
    name: 'quotes',
  });

  // Manage faq using useFieldArray
  const {
    fields: faqFields,
    append: appendFaq,
    remove: removeFaq,
  } = useFieldArray({
    control,
    name: 'faq',
  });

  // Manage themes (array of strings) manually with watch & setValue
  const currentThemes: string[] = watch('themes') || [];

  const handleAddTheme = (theme: string) => {
    const trimmed = theme.trim();
    if (trimmed && !currentThemes.includes(trimmed)) {
      setValue('themes', [...currentThemes, trimmed], { shouldDirty: true });
    }
  };

  const handleRemoveTheme = (theme: string) => {
    setValue(
      'themes',
      currentThemes.filter((t) => t !== theme),
      { shouldDirty: true }
    );
  };

  const currentAltTitles: string[] = watch('alternativeTitles') || [];

  const handleAddAltTitle = (title: string) => {
    const trimmed = title.trim();
    if (trimmed && !currentAltTitles.includes(trimmed)) {
      setValue('alternativeTitles', [...currentAltTitles, trimmed], { shouldDirty: true });
    }
  };

  const handleRemoveAltTitle = (title: string) => {
    setValue(
      'alternativeTitles',
      currentAltTitles.filter((t) => t !== title),
      { shouldDirty: true }
    );
  };

  // Autocomplete suggestions for themes
  const themeSuggestions = allExistingThemes.filter(
    (t) =>
      t.toLowerCase().includes(themeInput.toLowerCase()) &&
      !currentThemes.some((ct) => ct.toLowerCase() === t.toLowerCase())
  );

  return (
    <div className={styles.section}>
      <h2 className={styles.sectionTitle}>Additional Details (Manual Input)</h2>

      {/* Metadata Row */}
      <div className={styles.fieldRow}>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="originalLanguage">
            Original Language
          </label>
          <Input
            id="originalLanguage"
            placeholder="e.g. English"
            type="text"
            fullWidth
            {...register('originalLanguage')}
          />
          {errors.originalLanguage && (
            <span className={styles.error}>{errors.originalLanguage.message}</span>
          )}
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="copyrightStatus">
            Copyright Status
          </label>
          <Input
            id="copyrightStatus"
            placeholder="e.g. Public Domain"
            type="text"
            fullWidth
            {...register('copyrightStatus')}
          />
          {errors.copyrightStatus && (
            <span className={styles.error}>{errors.copyrightStatus.message}</span>
          )}
        </div>
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="authorPageUrl">
          Author Page Link / Slug
        </label>
        <Input
          id="authorPageUrl"
          placeholder="e.g. /en/author/oscar-wilde"
          type="text"
          fullWidth
          {...register('authorPageUrl')}
        />
        {errors.authorPageUrl && (
          <span className={styles.error}>{errors.authorPageUrl.message}</span>
        )}
      </div>

      {/* Alternative Titles */}
      <div className={styles.arraySection}>
        <h3 className={styles.arraySubTitle}>Alternative Titles</h3>
        <div className={styles.themeBadges}>
          {currentAltTitles.map((title) => (
            <span key={title} className={styles.themeBadge}>
              {title}
              <button type="button" onClick={() => handleRemoveAltTitle(title)}>
                ✕
              </button>
            </span>
          ))}
        </div>
        <div className={styles.addItemRow}>
          <div style={{ flex: 1 }}>
            <input
              className={styles.input}
              placeholder="Enter alternative title..."
              value={altTitleInput}
              onChange={(e) => setAltTitleInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (altTitleInput.trim()) {
                    handleAddAltTitle(altTitleInput);
                    setAltTitleInput('');
                  }
                }
              }}
            />
          </div>
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              if (altTitleInput.trim()) {
                handleAddAltTitle(altTitleInput);
                setAltTitleInput('');
              }
            }}
          >
            Add
          </Button>
        </div>
        <span className={styles.hint}>Press Enter or click Add to add an alternative title.</span>
      </div>

      {/* Short Description */}
      <div className={styles.field}>
        <label className={styles.label} htmlFor="shortDescription">
          Short Description (1-2 sentences)
        </label>
        <Input
          id="shortDescription"
          placeholder="Enter short description"
          type="text"
          fullWidth
          {...register('shortDescription')}
        />
        {errors.shortDescription && (
          <span className={styles.error}>{errors.shortDescription.message}</span>
        )}
      </div>

      {/* Short Summary */}
      <div className={styles.field}>
        <label className={styles.label} htmlFor="summaryShort">
          Summary (Short, 80-160 words)
        </label>
        <textarea
          className={styles.textarea}
          id="summaryShort"
          placeholder="Enter short summary..."
          rows={4}
          {...register('summaryShort')}
        />
        {errors.summaryShort && <span className={styles.error}>{errors.summaryShort.message}</span>}
      </div>

      {/* Themes Manager */}
      <div className={styles.arraySection}>
        <h3 className={styles.arraySubTitle}>Themes</h3>

        {/* Render theme badges */}
        <div className={styles.themeBadges}>
          {currentThemes.map((theme) => (
            <span key={theme} className={styles.themeBadge}>
              {theme}
              <button type="button" onClick={() => handleRemoveTheme(theme)}>
                ✕
              </button>
            </span>
          ))}
        </div>

        {/* Theme Input & Dropdown */}
        <div className={styles.dropdownContainer}>
          <div className={styles.addItemRow}>
            <div style={{ flex: 1 }}>
              <input
                className={styles.input}
                placeholder="Enter theme or select from dropdown..."
                value={themeInput}
                onChange={(e) => {
                  setThemeInput(e.target.value);
                  setShowThemeDropdown(true);
                }}
                onFocus={() => setShowThemeDropdown(true)}
                onBlur={() => {
                  // Delay closing to allow clicks to register
                  setTimeout(() => setShowThemeDropdown(false), 200);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (themeInput.trim()) {
                      handleAddTheme(themeInput);
                      setThemeInput('');
                    }
                  }
                }}
              />
            </div>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                if (themeInput.trim()) {
                  handleAddTheme(themeInput);
                  setThemeInput('');
                }
              }}
            >
              Add
            </Button>
          </div>

          {showThemeDropdown && themeInput.trim().length > 0 && themeSuggestions.length > 0 && (
            <div className={styles.dropdownMenu}>
              {themeSuggestions.map((suggestion) => (
                <div
                  key={suggestion}
                  className={styles.dropdownItem}
                  onMouseDown={() => {
                    handleAddTheme(suggestion);
                    setThemeInput('');
                    setShowThemeDropdown(false);
                  }}
                >
                  {suggestion}
                </div>
              ))}
            </div>
          )}
        </div>
        <span className={styles.hint}>
          Press Enter or click Add to add a theme. Auto-suggestions are based on existing database
          values.
        </span>
      </div>

      {/* Characters Manager */}
      <div className={styles.arraySection}>
        <h3 className={styles.arraySubTitle}>Characters</h3>
        <div>
          {characterFields.map((field, index) => (
            <div key={field.id} className={styles.listItem}>
              <span>
                <strong>{field.name}</strong> — {field.description}
              </span>
              <Button
                type="button"
                variant="ghost"
                onClick={() => removeCharacter(index)}
                style={{ padding: '4px 8px', height: 'auto' }}
              >
                Remove
              </Button>
            </div>
          ))}
        </div>
        <div className={styles.addItemRow}>
          <div style={{ flex: 1 }}>
            <Input
              placeholder="Character Name"
              value={newCharName}
              onChange={(e) => setNewCharName(e.target.value)}
              fullWidth
            />
          </div>
          <div style={{ flex: 2 }}>
            <Input
              placeholder="Character Description"
              value={newCharDesc}
              onChange={(e) => setNewCharDesc(e.target.value)}
              fullWidth
            />
          </div>
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              if (newCharName.trim() && newCharDesc.trim()) {
                appendCharacter({ name: newCharName.trim(), description: newCharDesc.trim() });
                setNewCharName('');
                setNewCharDesc('');
              }
            }}
          >
            Add Character
          </Button>
        </div>
      </div>

      {/* Symbols Manager */}
      <div className={styles.arraySection}>
        <h3 className={styles.arraySubTitle}>Symbols</h3>
        <div>
          {symbolFields.map((field, index) => (
            <div key={field.id} className={styles.listItem}>
              <span>
                <strong>{field.title}</strong> — {field.description}
              </span>
              <Button
                type="button"
                variant="ghost"
                onClick={() => removeSymbol(index)}
                style={{ padding: '4px 8px', height: 'auto' }}
              >
                Remove
              </Button>
            </div>
          ))}
        </div>
        <div className={styles.addItemRow}>
          <div style={{ flex: 1 }}>
            <Input
              placeholder="Symbol Name / Title (e.g. The Portrait)"
              value={newSymbolTitle}
              onChange={(e) => setNewSymbolTitle(e.target.value)}
              fullWidth
            />
          </div>
          <div style={{ flex: 2 }}>
            <Input
              placeholder="Symbol Description"
              value={newSymbolDesc}
              onChange={(e) => setNewSymbolDesc(e.target.value)}
              fullWidth
            />
          </div>
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              if (newSymbolTitle.trim() && newSymbolDesc.trim()) {
                appendSymbol({ title: newSymbolTitle.trim(), description: newSymbolDesc.trim() });
                setNewSymbolTitle('');
                setNewSymbolDesc('');
              }
            }}
          >
            Add Symbol
          </Button>
        </div>
      </div>

      {/* Quotes Manager */}
      <div className={styles.arraySection}>
        <h3 className={styles.arraySubTitle}>Quotes</h3>
        <div>
          {quoteFields.map((field, index) => (
            <div key={field.id} className={styles.listItem}>
              <span>
                &ldquo;{field.text}&rdquo; {field.author ? `— ${field.author}` : ''}
              </span>
              <Button
                type="button"
                variant="ghost"
                onClick={() => removeQuote(index)}
                style={{ padding: '4px 8px', height: 'auto' }}
              >
                Remove
              </Button>
            </div>
          ))}
        </div>
        <div className={styles.addItemRow}>
          <div style={{ flex: 2 }}>
            <textarea
              className={styles.textarea}
              placeholder="Quote text..."
              value={newQuoteText}
              onChange={(e) => setNewQuoteText(e.target.value)}
              rows={2}
            />
          </div>
          <div style={{ flex: 1 }}>
            <Input
              placeholder="Quote Author (optional)"
              value={newQuoteAuthor}
              onChange={(e) => setNewQuoteAuthor(e.target.value)}
              fullWidth
            />
          </div>
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              if (newQuoteText.trim()) {
                appendQuote({
                  text: newQuoteText.trim(),
                  author: newQuoteAuthor.trim() || undefined,
                });
                setNewQuoteText('');
                setNewQuoteAuthor('');
              }
            }}
          >
            Add Quote
          </Button>
        </div>
      </div>

      {/* FAQ Manager */}
      <div className={styles.arraySection}>
        <h3 className={styles.arraySubTitle}>FAQ (Frequently Asked Questions)</h3>
        <div>
          {faqFields.map((field, index) => (
            <div
              key={field.id}
              className={styles.listItem}
              style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '4px' }}
            >
              <div
                style={{
                  display: 'flex',
                  width: '100%',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <strong>Q: {field.question}</strong>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => removeFaq(index)}
                  style={{ padding: '4px 8px', height: 'auto' }}
                >
                  Remove
                </Button>
              </div>
              <span style={{ color: 'var(--color-text-secondary)' }}>A: {field.answer}</span>
            </div>
          ))}
        </div>
        <div className={styles.addItemRow} style={{ flexDirection: 'column', gap: '8px' }}>
          <Input
            placeholder="FAQ Question (e.g. Who wrote this book?)"
            value={newFaqQuestion}
            onChange={(e) => setNewFaqQuestion(e.target.value)}
            fullWidth
          />
          <textarea
            className={styles.textarea}
            placeholder="FAQ Answer..."
            value={newFaqAnswer}
            onChange={(e) => setNewFaqAnswer(e.target.value)}
            rows={2}
          />
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              if (newFaqQuestion.trim() && newFaqAnswer.trim()) {
                appendFaq({ question: newFaqQuestion.trim(), answer: newFaqAnswer.trim() });
                setNewFaqQuestion('');
                setNewFaqAnswer('');
              }
            }}
            style={{ alignSelf: 'flex-end' }}
          >
            Add FAQ Item
          </Button>
        </div>
      </div>
    </div>
  );
};
