# Checkbox Component

Reusable Checkbox component with custom styling using native HTML input for full react-hook-form compatibility.

## Features

- **Sizes**: `sm`, `md`, `lg` - different checkbox and label sizes
- **Error State**: Visual error indication for form validation
- **Indeterminate State**: Support for "select all" functionality
- **Label Placement**: Label can be placed at `start` or `end` of checkbox
- **Controlled & Uncontrolled**: Supports both modes
- **react-hook-form**: Seamless integration with register or Controller

## Installation

The component is part of the common components library. Import from:

```tsx
import { Checkbox } from '@/components/common/Checkbox';
import type { CheckboxProps } from '@/components/common/Checkbox';
```

## Usage

### Basic Usage

```tsx
<Checkbox label="Accept terms" onChange={(e) => console.log(e.target.checked)} />
```

### With react-hook-form (register)

The simplest way to integrate with react-hook-form:

```tsx
import { useForm } from 'react-hook-form';
import { Checkbox } from '@/components/common/Checkbox';

function MyForm() {
  const { register } = useForm();

  return <Checkbox label="This version is free" {...register('isFree')} />;
}
```

### With react-hook-form (Controller)

For more control over the checkbox behavior:

```tsx
import { Controller } from 'react-hook-form';
import { Checkbox } from '@/components/common/Checkbox';

<Controller
  name="acceptTerms"
  control={control}
  render={({ field }) => (
    <Checkbox
      {...field}
      checked={field.value}
      label="I accept the terms"
      error={!!errors.acceptTerms}
    />
  )}
/>;
```

### Indeterminate State (Select All)

```tsx
const [selectedItems, setSelectedItems] = useState<string[]>([]);
const allItems = ['item1', 'item2', 'item3'];

const allChecked = selectedItems.length === allItems.length;
const someChecked = selectedItems.length > 0 && !allChecked;

const handleSelectAll = () => {
  if (allChecked) {
    setSelectedItems([]);
  } else {
    setSelectedItems(allItems);
  }
};

<Checkbox
  indeterminate={someChecked}
  checked={allChecked}
  onChange={handleSelectAll}
  label="Select all"
/>;
```

### With Error State

```tsx
<Checkbox label="Required checkbox" error={!!errors.required} />
```

### Label Placement

```tsx
// Label after checkbox (default)
<Checkbox label="Enable feature" labelPlacement="end" />

// Label before checkbox
<Checkbox label="Enable feature" labelPlacement="start" />
```

### Different Sizes

```tsx
<Checkbox size="sm" label="Small" />
<Checkbox size="md" label="Medium (default)" />
<Checkbox size="lg" label="Large" />
```

### Without Label

```tsx
<Checkbox ariaLabel="Toggle item" onChange={handleToggle} />
```

### Disabled State

```tsx
<Checkbox label="Disabled checkbox" disabled />
<Checkbox label="Disabled checked" disabled checked />
```

## Props

| Prop             | Type                       | Default | Description                              |
| ---------------- | -------------------------- | ------- | ---------------------------------------- |
| `checked`        | `boolean`                  | -       | Controlled checked state                 |
| `defaultChecked` | `boolean`                  | -       | Default checked state (uncontrolled)     |
| `indeterminate`  | `boolean`                  | `false` | Indeterminate state for "select all"     |
| `size`           | `'sm' \| 'md' \| 'lg'`     | `'md'`  | Size of the checkbox                     |
| `disabled`       | `boolean`                  | `false` | Disabled state                           |
| `error`          | `boolean`                  | `false` | Error state for validation               |
| `label`          | `ReactNode`                | -       | Label content                            |
| `labelPlacement` | `'start' \| 'end'`         | `'end'` | Label placement relative to checkbox     |
| `onChange`       | `(e: ChangeEvent) => void` | -       | Change handler                           |
| `onBlur`         | `(e: FocusEvent) => void`  | -       | Blur handler (for react-hook-form)       |
| `ariaLabel`      | `string`                   | -       | Accessible label (when no visible label) |
| `name`           | `string`                   | -       | Field name for forms                     |
| `id`             | `string`                   | -       | HTML id (defaults to name)               |
| `value`          | `string`                   | -       | Value attribute for form submission      |
| `className`      | `string`                   | -       | Additional CSS class                     |

## Styling

The component uses SCSS modules with design tokens from `@/styles/tokens.scss`.

### Size Reference

| Size | Checkbox | Font Size |
| ---- | -------- | --------- |
| sm   | 14px     | 14px      |
| md   | 16px     | 16px      |
| lg   | 20px     | 18px      |

### Custom Classes

- `.wrapper` - Outer wrapper with label
- `.checkboxWrapper` - Container for input and custom checkbox
- `.input` - Hidden native checkbox
- `.checkbox` - Custom styled checkbox
- `.checkmark` - Checkmark SVG icon
- `.indeterminate` - Indeterminate (minus) SVG icon
- `.label` - Label text

## Accessibility

- Uses native `<input type="checkbox">` for full accessibility
- Supports `aria-label` prop for screen readers when no visible label
- Proper `id` and `name` attributes for form association
- Keyboard navigation support (Space to toggle)
- Focus management with visible focus ring
- `aria-invalid` set when in error state

## Why Native Input?

This component uses a native `<input type="checkbox">` instead of a library component (like Ant Design) for several reasons:

1. **react-hook-form compatibility**: Native inputs work seamlessly with `register()` and `Controller`
2. **No styling conflicts**: Full control over styles without fighting library CSS
3. **Performance**: No extra JavaScript overhead from UI libraries
4. **Accessibility**: Native inputs have built-in accessibility features

## Related Components

- [Input](/components/common/Input/README.md) - Text input component
- [Select](/components/common/Select/README.md) - Select/dropdown component
- [Button](/components/common/Button/README.md) - Button component
