# Select Component

Reusable Select component wrapping Ant Design Select with extended API for project consistency.

## Features

- **Sizes**: `sm`, `md`, `lg` - mapped to antd small/middle/large
- **Error State**: Visual error indication for form validation
- **Loading State**: Shows spinner when data is loading
- **Full Width**: Option to span full container width
- **Modes**: Single, multiple, and tags selection
- **Search**: Built-in search/filter functionality
- **react-hook-form**: Seamless integration with Controller

## Installation

The component is part of the common components library. Import from:

```tsx
import { Select } from '@/components/common/Select';
import type { SelectOption } from '@/components/common/Select';
```

## Usage

### Basic Usage

```tsx
<Select
  options={[
    { label: 'Option 1', value: '1' },
    { label: 'Option 2', value: '2' },
    { label: 'Option 3', value: '3' },
  ]}
  placeholder="Select an option"
  onChange={(value) => console.log(value)}
/>
```

### With react-hook-form

```tsx
import { Controller } from 'react-hook-form';
import { Select } from '@/components/common/Select';

<Controller
  name="category"
  control={control}
  render={({ field, fieldState }) => (
    <Select
      {...field}
      options={categories}
      error={!!fieldState.error}
      placeholder="Select category"
    />
  )}
/>;
```

### Multiple Selection with Search

```tsx
<Select
  mode="multiple"
  showSearch
  options={tags}
  placeholder="Select tags"
  allowClear
  maxTagCount="responsive"
/>
```

### Tags Mode (Create New Options)

```tsx
<Select mode="tags" options={existingTags} placeholder="Enter or select tags" />
```

### Full Width with Error State

```tsx
<Select fullWidth error={!!errors.language} options={languages} placeholder="Select language" />
```

### Different Sizes

```tsx
<Select size="sm" options={options} placeholder="Small" />
<Select size="md" options={options} placeholder="Medium (default)" />
<Select size="lg" options={options} placeholder="Large" />
```

### With Loading State

```tsx
<Select loading={isLoading} options={options} placeholder="Loading options..." />
```

### Custom Option Rendering

```tsx
const options: SelectOption[] = [
  {
    label: <span>🇺🇸 English</span>,
    value: 'en',
  },
  {
    label: <span>🇫🇷 Français</span>,
    value: 'fr',
  },
];

<Select options={options} placeholder="Select language" />;
```

## Props

| Prop                | Type                               | Default    | Description                |
| ------------------- | ---------------------------------- | ---------- | -------------------------- |
| `size`              | `'sm' \| 'md' \| 'lg'`             | `'md'`     | Size of the select         |
| `fullWidth`         | `boolean`                          | `false`    | Whether to span full width |
| `error`             | `boolean`                          | `false`    | Error state for validation |
| `loading`           | `boolean`                          | `false`    | Loading state              |
| `disabled`          | `boolean`                          | `false`    | Disabled state             |
| `placeholder`       | `string`                           | -          | Placeholder text           |
| `options`           | `SelectOption[]`                   | -          | Array of options           |
| `value`             | `T \| T[]`                         | -          | Controlled value           |
| `defaultValue`      | `T \| T[]`                         | -          | Default value              |
| `onChange`          | `(value: T \| T[]) => void`        | -          | Change handler             |
| `onBlur`            | `() => void`                       | -          | Blur handler               |
| `allowClear`        | `boolean`                          | `false`    | Allow clearing selection   |
| `showSearch`        | `boolean`                          | `false`    | Enable search              |
| `mode`              | `'single' \| 'multiple' \| 'tags'` | `'single'` | Selection mode             |
| `ariaLabel`         | `string`                           | -          | Accessible label           |
| `className`         | `string`                           | -          | Additional CSS class       |
| `name`              | `string`                           | -          | Field name                 |
| `autoFocus`         | `boolean`                          | `false`    | Auto focus on mount        |
| `filterOption`      | `function \| boolean`              | -          | Custom filter function     |
| `maxTagCount`       | `number \| 'responsive'`           | -          | Max tags to show           |
| `getPopupContainer` | `function`                         | -          | Custom popup container     |

## SelectOption Type

```typescript
interface SelectOption<T = string> {
  label: ReactNode; // Display text or custom element
  value: T; // Option value
  disabled?: boolean; // Whether option is disabled
}
```

## Styling

The component uses SCSS modules with design tokens from `@/styles/tokens.scss`.

Custom classes:

- `.select` - Base styles
- `.fullWidth` - Full width mode
- `.error` - Error state styling

## Accessibility

- Supports `aria-label` prop for screen readers
- Keyboard navigation (arrow keys, Enter, Escape)
- Focus management
- Clear button accessible

## Related Components

- [Button](/components/common/Button/README.md) - Similar component pattern
- [SlugInput](/components/common/SlugInput/README.md) - Input with validation
