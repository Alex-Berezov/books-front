import type { SlugEntityType } from '@/lib/hooks/useSlugValidation';
import type { SupportedLang } from '@/lib/i18n/lang';

/**
 * SlugInput component props
 */
export interface SlugInputProps {
  /** Current slug value */
  value: string;
  /** Callback on slug change */
  onChange: (value: string) => void;
  /**
   * Whether the form is creating a new record or editing an existing one.
   *
   * Required on purpose, and deliberately not inferred from `excludeId`: an
   * existing slug is a published URL, and auto-generation must never touch it.
   * The previous guard derived the same fact from other props and got it wrong
   * on any form that hydrated its title before its slug — which is how the
   * homepage's `homepage-index` quietly became `homepage`. A form that forgets
   * to state its mode now fails to compile instead of failing in production.
   */
  mode: 'create' | 'edit';
  /** Source value for auto-generation (usually title) */
  sourceValue?: string;
  /** Entity type (page | book) for uniqueness check */
  entityType: SlugEntityType;
  /** Language (for pages) */
  lang?: SupportedLang;
  /** ID of edited entity (to exclude from uniqueness check) */
  excludeId?: string;
  /** Disable field */
  disabled?: boolean;
  /** Show "Generate from title" button */
  showGenerateButton?: boolean;
  /** Automatically generate slug when entering sourceValue */
  autoGenerate?: boolean;
  /** Input placeholder */
  placeholder?: string;
  /** ID for HTML element */
  id?: string;
  /** CSS class for customization */
  className?: string;
  /** Validation error message (from react-hook-form) */
  error?: string;
}

/**
 * Props for StatusIcon component
 */
export interface StatusIconProps {
  /** Validation status */
  status: 'idle' | 'checking' | 'valid' | 'invalid';
}

/**
 * Props for GenerateButton component
 */
export interface GenerateButtonProps {
  /** Whether source value exists for generation */
  hasSourceValue: boolean;
  /** Click handler */
  onClick: () => void;
}

/**
 * Props for ValidationHint component
 */
export interface ValidationHintProps {
  /** Placeholder for example */
  placeholder: string;
}

/**
 * Props for DuplicateWarning component
 */
export interface DuplicateWarningProps {
  /** Entity type */
  entityType: SlugEntityType;
  /** Current slug */
  slug: string;
  /** Existing entity with this slug */
  existingItem: {
    title: string;
    status: string;
  };
  /** Suggested slug */
  suggestedSlug?: string;
  /** Handler for applying suggested slug */
  onUseSuggested: () => void;
}
