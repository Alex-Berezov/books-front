/**
 * Common SEO sections for admin forms
 *
 * These components are generic and can be used for:
 * - Pages (CMS)
 * - Book Versions
 * - Categories
 * - Tags
 * - Any other entity with SEO metadata
 */

export { SeoBasicSection } from './SeoBasicSection';
export type { SeoBasicSectionProps } from './SeoBasicSection';

export { SeoTechnicalSection } from './SeoTechnicalSection';
export type { SeoTechnicalSectionProps } from './SeoTechnicalSection';

export { SeoOpenGraphSection } from './SeoOpenGraphSection';
export type { SeoOpenGraphSectionProps } from './SeoOpenGraphSection';

export { SeoTwitterSection } from './SeoTwitterSection';
export type { SeoTwitterSectionProps } from './SeoTwitterSection';

// Re-export UI components
export { CharCounter } from './ui/CharCounter';
export type { CharCounterProps } from './ui/CharCounter';

export { FormField } from './ui/FormField';
export type { FormFieldProps } from './ui/FormField';

export { SeoCollapsible } from './ui/SeoCollapsible';
export type { SeoCollapsibleProps } from './ui/SeoCollapsible';
