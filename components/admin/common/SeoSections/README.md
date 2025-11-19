# Common SEO Sections

Reusable SEO form sections for admin panel.

## 📁 Structure

```
components/admin/common/SeoSections/
├── index.ts                      # Re-exports all components
├── SeoBasicSection.tsx           # Meta Title & Meta Description
├── SeoTechnicalSection.tsx       # Canonical URL & Robots
├── SeoOpenGraphSection.tsx       # Open Graph (Facebook, LinkedIn)
├── SeoTwitterSection.tsx         # Twitter Card
└── ui/
    ├── index.ts                  # Re-exports UI components
    ├── CharCounter.tsx           # Character counter for fields
    ├── FormField.tsx             # Reusable form field wrapper
    ├── SeoCollapsible.tsx        # Collapsible section for SEO
    └── SeoUI.module.scss         # Shared styles for UI components
```

## 🎯 Purpose

These components are **generic** and can be used in any admin form that needs SEO metadata:

- ✅ Pages (CMS)
- ✅ Book Versions
- ✅ Categories
- ✅ Tags
- ✅ Any other entity with SEO

## 📚 Usage Example

### Basic Integration

```tsx
import {
  SeoBasicSection,
  SeoTechnicalSection,
  SeoOpenGraphSection,
  SeoTwitterSection,
} from '@/components/admin/common/SeoSections';
import styles from './MyForm.module.scss';

export const MyForm = () => {
  const { register, errors, watch, setValue } = useForm<MyFormData>();

  return (
    <form>
      {/* Basic SEO */}
      <SeoBasicSection<MyFormData>
        errors={errors}
        isSubmitting={false}
        metaTitleField="seoMetaTitle"
        metaDescriptionField="seoMetaDescription"
        register={register}
        styles={styles}
        watch={watch}
      />

      {/* Technical SEO */}
      <SeoTechnicalSection<MyFormData>
        canonicalUrlField="seoCanonicalUrl"
        errors={errors}
        isSubmitting={false}
        languageField="language"
        register={register}
        robotsField="seoRobots"
        setValue={setValue}
        slugField="slug"
        styles={styles}
        watch={watch}
      />

      {/* Open Graph */}
      <SeoOpenGraphSection<MyFormData>
        errors={errors}
        isSubmitting={false}
        ogDescriptionField="seoOgDescription"
        ogImageUrlField="seoOgImageUrl"
        ogTitleField="seoOgTitle"
        register={register}
        styles={styles}
        watch={watch}
      />

      {/* Twitter Card */}
      <SeoTwitterSection<MyFormData>
        errors={errors}
        isSubmitting={false}
        register={register}
        styles={styles}
        twitterCardField="seoTwitterCard"
      />
    </form>
  );
};
```

## 🔧 Required Form Schema

Your Zod schema should include these fields:

```typescript
const myFormSchema = z.object({
  // ... other fields

  // SEO fields
  seoMetaTitle: z.string().max(60, 'Meta Title should be 50-60 characters'),
  seoMetaDescription: z.string().max(160, 'Meta Description should be 120-160 characters'),
  seoCanonicalUrl: z.string(),
  seoRobots: z.string(),
  seoOgTitle: z.string().max(60, 'OG Title is too long'),
  seoOgDescription: z.string().max(160, 'OG Description is too long'),
  seoOgImageUrl: z.string(),
  seoTwitterCard: z.enum(['summary', 'summary_large_image', '']),
});
```

## 🎨 Required SCSS Classes

Your SCSS module should include:

```scss
@import '@/styles/tokens.scss';

.input {
  // Input field styles
}

.textarea {
  // Textarea field styles
}

.select {
  // Select field styles
}

.inputWithButton {
  display: flex;
  gap: $spacing-sm;
}

.inputButton {
  // Button styles for canonical URL generator
}

.imagePreview {
  // Image preview styles for OG Image
}

.autoFillNotice {
  // Notice styles for auto-filled fields
}
```

## ✨ Features

### Auto-fill Logic

The components support auto-fill from Meta fields to OG fields. Implement in parent form:

```tsx
useEffect(() => {
  const subscription = watch((value, { name }) => {
    if (name === 'seoMetaTitle') {
      setValue('seoOgTitle', value.seoMetaTitle || '', { shouldDirty: false });
    }
    if (name === 'seoMetaDescription') {
      setValue('seoOgDescription', value.seoMetaDescription || '', { shouldDirty: false });
    }
  });

  return () => subscription.unsubscribe();
}, [watch, setValue]);
```

### Canonical URL Generation

`SeoTechnicalSection` includes a "Use Current URL" button that auto-generates canonical URL from slug and language.

### Character Counters

All text fields show character count (current / max) to help users stay within SEO limits.

### Image Preview

`SeoOpenGraphSection` shows live preview of the OG Image URL.

## 🔄 Migration from PageForm

The components were extracted from `components/admin/pages/PageForm/sections/` to be reusable across the admin panel.

**Old structure:**

```
components/admin/pages/PageForm/
  sections/
    SeoBasicSection.tsx        (specific to PageFormData)
    SeoTechnicalSection.tsx    (specific to PageFormData)
    SeoOpenGraphSection.tsx    (specific to PageFormData)
    SeoTwitterSection.tsx      (specific to PageFormData)
  ui/
    CharCounter.tsx
    FormField.tsx
    SeoCollapsible.tsx
```

**New structure:**

```
components/admin/common/SeoSections/  (generic for any form)
  SeoBasicSection.tsx
  SeoTechnicalSection.tsx
  SeoOpenGraphSection.tsx
  SeoTwitterSection.tsx
  ui/
    CharCounter.tsx
    FormField.tsx
    SeoCollapsible.tsx
```

## 📖 References

- **Pages implementation:** `components/admin/pages/PageForm/index.tsx`
- **API types:** `types/api-schema/pages.ts` (`SeoInput`, `SeoData`)
- **Backend guide:** `docs/PAGES_SEO_UPDATE_GUIDE.md`
